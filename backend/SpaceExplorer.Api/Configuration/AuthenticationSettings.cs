namespace SpaceExplorer.Api.Configuration;

public enum AuthenticationMode
{
    Oidc,
    Development,
}

public sealed class AuthenticationSettings
{
    public const string Section = "Authentication";

    public AuthenticationMode Mode { get; set; } = AuthenticationMode.Oidc;
    public OidcSettings Oidc { get; set; } = new();

    /// <summary>Development mode only: key of the profile in <see cref="DevUsers"/> to impersonate.</summary>
    public string DevUser { get; set; } = "";
    public Dictionary<string, DevUserSettings> DevUsers { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class OidcSettings
{
    public string Authority { get; set; } = "";
    public string ClientId { get; set; } = "";
    public string ClientSecret { get; set; } = "";
    public string NameClaim { get; set; } = "preferred_username";
    public string GroupClaim { get; set; } = "group";

    // No default items: the configuration binder appends to existing array items instead of replacing them.
    public string[] Scopes { get; set; } = [];
}

public sealed class DevUserSettings
{
    public string Name { get; set; } = "";
    public string[] Groups { get; set; } = [];
}
