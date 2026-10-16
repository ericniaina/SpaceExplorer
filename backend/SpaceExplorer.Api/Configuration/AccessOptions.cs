namespace SpaceExplorer.Api.Configuration;

/// <summary>Maps SSO groups to application rights. Any other group is matched against compartment names.</summary>
public sealed class AccessOptions
{
    public const string Section = "Authorization";

    public string AdminGroup { get; set; } = "Admin";
}
