using System.Security.Claims;
using EatOut.Api;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;

var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("EatOut")
    ?? Environment.GetEnvironmentVariable("EAT_OUT_SQL_CONNECTION_STRING");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "Configure ConnectionStrings__EatOut or EAT_OUT_SQL_CONNECTION_STRING with the SQL Server connection string.");
}

builder.Services.AddSingleton(new SqlStore(connectionString));
builder.Services.AddSingleton<PasswordHasher<OwnerAccount>>();
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "__Host-EatOutOwner";
        options.Cookie.HttpOnly = true;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.Cookie.Path = "/";
        options.SlidingExpiration = true;
        options.ExpireTimeSpan = TimeSpan.FromDays(7);
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("owner-auth", limiter =>
    {
        limiter.PermitLimit = 8;
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.QueueLimit = 0;
        limiter.AutoReplenishment = true;
    });
});

var app = builder.Build();
await app.Services.GetRequiredService<SqlStore>().InitializeAsync();

app.UseHttpsRedirection();
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/config", (IConfiguration configuration) =>
{
    var phone = new string((configuration["EatOut:WhatsAppNumber"] ?? "")
        .Where(char.IsAsciiDigit).ToArray());
    return Results.Ok(new { whatsappNumber = phone });
});

app.MapGet("/api/menu", async (SqlStore store, CancellationToken cancellationToken) =>
    Results.Ok(await store.GetMenuAsync(cancellationToken)));

app.MapGet("/api/owner/session", async (HttpContext context, SqlStore store, CancellationToken cancellationToken) =>
    Results.Ok(new
    {
        isOwner = context.User.Identity?.IsAuthenticated == true,
        setupRequired = !await store.OwnerExistsAsync(cancellationToken)
    }));

var ownerAuth = app.MapGroup("/api/owner").RequireRateLimiting("owner-auth");
ownerAuth.MapPost("/setup", async (
    OwnerPasswordRequest request,
    HttpContext context,
    SqlStore store,
    PasswordHasher<OwnerAccount> passwordHasher,
    CancellationToken cancellationToken) =>
{
    if (request.Password is null || request.Password.Length < 12)
    {
        return Results.BadRequest(new { message = "Choose a password with at least 12 characters." });
    }

    var hash = passwordHasher.HashPassword(OwnerAccount.Instance, request.Password);
    if (!await store.TryCreateOwnerAsync(hash, cancellationToken))
    {
        return Results.Conflict(new { message = "Owner setup is already complete. Sign in instead." });
    }

    await SignInOwnerAsync(context);
    return Results.Ok(new { isOwner = true });
});

ownerAuth.MapPost("/login", async (
    OwnerPasswordRequest request,
    HttpContext context,
    SqlStore store,
    PasswordHasher<OwnerAccount> passwordHasher,
    CancellationToken cancellationToken) =>
{
    var hash = await store.GetOwnerPasswordHashAsync(cancellationToken);
    if (hash is null || string.IsNullOrEmpty(request.Password))
    {
        return Results.Unauthorized();
    }

    var result = passwordHasher.VerifyHashedPassword(OwnerAccount.Instance, hash, request.Password);
    if (result == PasswordVerificationResult.Failed)
    {
        return Results.Unauthorized();
    }

    if (result == PasswordVerificationResult.SuccessRehashNeeded)
    {
        await store.UpdateOwnerPasswordHashAsync(
            passwordHasher.HashPassword(OwnerAccount.Instance, request.Password),
            cancellationToken);
    }

    await SignInOwnerAsync(context);
    return Results.Ok(new { isOwner = true });
});

ownerAuth.MapPost("/logout", async (HttpContext context) =>
{
    await context.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    return Results.NoContent();
});

app.MapPost("/api/menu", async (
    MenuItemRequest request,
    SqlStore store,
    CancellationToken cancellationToken) =>
{
    var validationError = ValidateMenuItem(request);
    if (validationError is not null)
    {
        return Results.BadRequest(new { message = validationError });
    }

    var item = await store.CreateMenuItemAsync(request, cancellationToken);
    return Results.Created($"/api/menu/{item.Id}", item);
}).RequireAuthorization();

app.MapPut("/api/menu/{id:int}", async (
    int id,
    MenuItemRequest request,
    SqlStore store,
    CancellationToken cancellationToken) =>
{
    var validationError = ValidateMenuItem(request);
    if (validationError is not null)
    {
        return Results.BadRequest(new { message = validationError });
    }

    var item = await store.UpdateMenuItemAsync(id, request, cancellationToken);
    return item is null ? Results.NotFound() : Results.Ok(item);
}).RequireAuthorization();

await app.RunAsync();

static string? ValidateMenuItem(MenuItemRequest request)
{
    if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Trim().Length > 100)
    {
        return "Give this menu item a name of 1 to 100 characters.";
    }

    if ((request.Description ?? "").Trim().Length > 500)
    {
        return "The description must be 500 characters or fewer.";
    }

    if (string.IsNullOrWhiteSpace(request.Category) || request.Category.Trim().Length > 60)
    {
        return "Give this menu item a category of 1 to 60 characters.";
    }

    if (request.Price is < 0 or > 99999.99m)
    {
        return "Enter a price from R0.00 to R99,999.99.";
    }

    return null;
}

static Task SignInOwnerAsync(HttpContext context)
{
    var identity = new ClaimsIdentity(
        [new Claim(ClaimTypes.NameIdentifier, "owner"), new Claim(ClaimTypes.Role, "Owner")],
        CookieAuthenticationDefaults.AuthenticationScheme);
    return context.SignInAsync(
        CookieAuthenticationDefaults.AuthenticationScheme,
        new ClaimsPrincipal(identity));
}
