using EatOut.Api;
using Microsoft.Data.SqlClient;
using System.Data;

namespace EatOut.Api;

public sealed class SqlStore(string connectionString)
{
    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await OpenConnectionAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            IF OBJECT_ID(N'dbo.EatOutOwners', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.EatOutOwners (
                    Id int NOT NULL CONSTRAINT PK_EatOutOwners PRIMARY KEY
                        CONSTRAINT CK_EatOutOwners_Singleton CHECK (Id = 1),
                    PasswordHash nvarchar(512) NOT NULL,
                    CreatedAt datetime2 NOT NULL CONSTRAINT DF_EatOutOwners_CreatedAt DEFAULT SYSUTCDATETIME()
                );
            END;

            IF OBJECT_ID(N'dbo.EatOutMenuItems', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.EatOutMenuItems (
                    Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_EatOutMenuItems PRIMARY KEY,
                    Name nvarchar(100) NOT NULL,
                    Description nvarchar(500) NOT NULL CONSTRAINT DF_EatOutMenuItems_Description DEFAULT N'',
                    Category nvarchar(60) NOT NULL,
                    Price decimal(7,2) NOT NULL CONSTRAINT CK_EatOutMenuItems_Price CHECK (Price >= 0),
                    SortOrder int NOT NULL CONSTRAINT DF_EatOutMenuItems_SortOrder DEFAULT 0,
                    IsAvailable bit NOT NULL CONSTRAINT DF_EatOutMenuItems_IsAvailable DEFAULT 1,
                    CreatedAt datetime2 NOT NULL CONSTRAINT DF_EatOutMenuItems_CreatedAt DEFAULT SYSUTCDATETIME(),
                    UpdatedAt datetime2 NOT NULL CONSTRAINT DF_EatOutMenuItems_UpdatedAt DEFAULT SYSUTCDATETIME()
                );
            END;
            """;
        await command.ExecuteNonQueryAsync(cancellationToken);

        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);
        await using var seedCommand = new SqlCommand(
            """
            IF NOT EXISTS (SELECT 1 FROM dbo.EatOutMenuItems WITH (TABLOCKX, HOLDLOCK))
            BEGIN
                INSERT INTO dbo.EatOutMenuItems (Name, Description, Category, Price, SortOrder)
                VALUES
                    (N'Classic Kota', N'Bread, Polony & Achar', N'Toasted Kota', 15, 10),
                    (N'Vienna Kota', N'Bread, Polony, Achar & Vienna', N'Toasted Kota', 19, 20),
                    (N'Special Vienna Kota', N'Bread, Polony, Achar, Special & Vienna', N'Toasted Kota', 23, 30),
                    (N'Cheese & Vienna Kota', N'Bread, Polony, Achar, Vienna & Cheese', N'Toasted Kota', 25, 40),
                    (N'Beef Burger Kota', N'Bread, Polony, Achar, Cheese, Vienna & Beef Burger', N'Toasted Kota', 28, 50),
                    (N'Russian Kota', N'Bread, Polony, Achar, Cheese, Vienna & Russian', N'Toasted Kota', 30, 60),
                    (N'The Works Kota', N'Bread, Polony, Achar, Cheese, Vienna, Burger & Russian', N'Toasted Kota', 35, 70),
                    (N'Small chips + half bread', N'', N'Combos', 20, 80),
                    (N'Chips, half bread & 2 Viennas', N'', N'Combos', 30, 90);
            END;
            """,
            connection,
            transaction);
        await seedCommand.ExecuteNonQueryAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    public async Task<bool> OwnerExistsAsync(CancellationToken cancellationToken)
    {
        await using var connection = await OpenConnectionAsync(cancellationToken);
        await using var command = new SqlCommand(
            "SELECT CAST(CASE WHEN EXISTS (SELECT 1 FROM dbo.EatOutOwners WHERE Id = 1) THEN 1 ELSE 0 END AS bit);",
            connection);
        return (bool)(await command.ExecuteScalarAsync(cancellationToken) ?? false);
    }

    public async Task<string?> GetOwnerPasswordHashAsync(CancellationToken cancellationToken)
    {
        await using var connection = await OpenConnectionAsync(cancellationToken);
        await using var command = new SqlCommand(
            "SELECT PasswordHash FROM dbo.EatOutOwners WHERE Id = 1;",
            connection);
        return await command.ExecuteScalarAsync(cancellationToken) as string;
    }

    public async Task<bool> TryCreateOwnerAsync(string passwordHash, CancellationToken cancellationToken)
    {
        await using var connection = await OpenConnectionAsync(cancellationToken);
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);
        await using var command = new SqlCommand(
            """
            IF EXISTS (SELECT 1 FROM dbo.EatOutOwners WITH (TABLOCKX, HOLDLOCK) WHERE Id = 1)
                SELECT CAST(0 AS bit);
            ELSE
            BEGIN
                INSERT INTO dbo.EatOutOwners (Id, PasswordHash) VALUES (1, @PasswordHash);
                SELECT CAST(1 AS bit);
            END;
            """,
            connection,
            transaction);
        command.Parameters.Add("@PasswordHash", System.Data.SqlDbType.NVarChar, 512).Value = passwordHash;
        var created = (bool)(await command.ExecuteScalarAsync(cancellationToken) ?? false);
        await transaction.CommitAsync(cancellationToken);
        return created;
    }

    public async Task UpdateOwnerPasswordHashAsync(string passwordHash, CancellationToken cancellationToken)
    {
        await using var connection = await OpenConnectionAsync(cancellationToken);
        await using var command = new SqlCommand(
            "UPDATE dbo.EatOutOwners SET PasswordHash = @PasswordHash WHERE Id = 1;",
            connection);
        command.Parameters.Add("@PasswordHash", System.Data.SqlDbType.NVarChar, 512).Value = passwordHash;
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<MenuItem>> GetMenuAsync(CancellationToken cancellationToken)
    {
        const string query = """
            SELECT Id, Name, Description, Category, Price, SortOrder, IsAvailable
            FROM dbo.EatOutMenuItems
            ORDER BY SortOrder, Id;
            """;
        await using var connection = await OpenConnectionAsync(cancellationToken);
        await using var command = new SqlCommand(query, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var items = new List<MenuItem>();
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(ReadMenuItem(reader));
        }

        return items;
    }

    public async Task<MenuItem> CreateMenuItemAsync(MenuItemRequest request, CancellationToken cancellationToken)
    {
        const string query = """
            INSERT INTO dbo.EatOutMenuItems (Name, Description, Category, Price, SortOrder)
            OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.Description, INSERTED.Category,
                   INSERTED.Price, INSERTED.SortOrder, INSERTED.IsAvailable
            VALUES (@Name, @Description, @Category, @Price,
                (SELECT ISNULL(MAX(SortOrder), 0) + 10 FROM dbo.EatOutMenuItems));
            """;
        await using var connection = await OpenConnectionAsync(cancellationToken);
        await using var command = new SqlCommand(query, connection);
        AddMenuParameters(command, request);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        return ReadMenuItem(reader);
    }

    public async Task<MenuItem?> UpdateMenuItemAsync(
        int id,
        MenuItemRequest request,
        CancellationToken cancellationToken)
    {
        const string query = """
            UPDATE dbo.EatOutMenuItems
            SET Name = @Name, Description = @Description, Category = @Category,
                Price = @Price, UpdatedAt = SYSUTCDATETIME()
            OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.Description, INSERTED.Category,
                   INSERTED.Price, INSERTED.SortOrder, INSERTED.IsAvailable
            WHERE Id = @Id;
            """;
        await using var connection = await OpenConnectionAsync(cancellationToken);
        await using var command = new SqlCommand(query, connection);
        AddMenuParameters(command, request);
        command.Parameters.Add("@Id", System.Data.SqlDbType.Int).Value = id;
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadMenuItem(reader) : null;
    }

    private async Task<SqlConnection> OpenConnectionAsync(CancellationToken cancellationToken)
    {
        var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        return connection;
    }

    private static void AddMenuParameters(SqlCommand command, MenuItemRequest request)
    {
        command.Parameters.Add("@Name", System.Data.SqlDbType.NVarChar, 100).Value = request.Name!.Trim();
        command.Parameters.Add("@Description", System.Data.SqlDbType.NVarChar, 500)
            .Value = (request.Description ?? "").Trim();
        command.Parameters.Add("@Category", System.Data.SqlDbType.NVarChar, 60).Value = request.Category!.Trim();
        command.Parameters.Add("@Price", System.Data.SqlDbType.Decimal).Value = request.Price;
        command.Parameters["@Price"].Precision = 7;
        command.Parameters["@Price"].Scale = 2;
    }

    private static MenuItem ReadMenuItem(SqlDataReader reader) => new(
        reader.GetInt32(0),
        reader.GetString(1),
        reader.GetString(2),
        reader.GetString(3),
        reader.GetDecimal(4),
        reader.GetInt32(5),
        reader.GetBoolean(6));
}
