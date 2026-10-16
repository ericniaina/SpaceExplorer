using System.Security.Claims;
using SpaceExplorer.Api.Security;

namespace SpaceExplorer.Tests;

public class UserAccessTests
{
    private static ClaimsPrincipal Principal(params string[] groups)
    {
        var claims = new List<Claim> { new("preferred_username", "jdoe") };
        claims.AddRange(groups.Select(g => new Claim("group", g)));
        return new ClaimsPrincipal(new ClaimsIdentity(claims, "test", "preferred_username", "group"));
    }

    [Fact]
    public void Admin_group_grants_every_compartment()
    {
        var access = UserAccess.FromPrincipal(Principal("admin"), "group", "Admin");

        Assert.True(access.IsAdmin);
        Assert.True(access.CanSee("Compartiment9"));
    }

    [Fact]
    public void Compartment_groups_grant_matching_compartments_case_insensitively()
    {
        var access = UserAccess.FromPrincipal(Principal("Compartiment1", "COMPARTIMENT3"), "group", "Admin");

        Assert.Equal("jdoe", access.UserName);
        Assert.False(access.IsAdmin);
        Assert.True(access.CanSee("compartiment1"));
        Assert.True(access.CanSee("Compartiment3"));
        Assert.False(access.CanSee("Compartiment2"));
    }

    [Fact]
    public void Only_the_configured_group_claim_is_read()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity([new Claim("roles", "Admin")], "test"));

        Assert.False(UserAccess.FromPrincipal(principal, "group", "Admin").IsAdmin);
    }
}
