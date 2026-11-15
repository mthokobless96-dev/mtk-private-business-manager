namespace EatOut.Api;

public sealed record MenuItem(
    int Id,
    string Name,
    string Description,
    string Category,
    decimal Price,
    int SortOrder,
    bool IsAvailable);

public sealed record MenuItemRequest(
    string? Name,
    string? Description,
    string? Category,
    decimal Price);

public sealed record OwnerPasswordRequest(string? Password);

public sealed class OwnerAccount
{
    public static OwnerAccount Instance { get; } = new();
}
