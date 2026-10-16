using System.Security.Claims;
using Microsoft.Extensions.Options;
using SpaceExplorer.Api.Configuration;

namespace SpaceExplorer.Api.Security;

/// <summary>
/// What the current user may see. A compartment group grants access to that compartment in every space,
/// since spaces share the same compartment names.
/// </summary>
public sealed class UserAccess
{
    private readonly HashSet<string> _groups;

    public UserAccess(string userName, bool isAdmin, IEnumerable<string> groups)
    {
        UserName = userName;
        IsAdmin = isAdmin;
        _groups = new HashSet<string>(groups, StringComparer.OrdinalIgnoreCase);
    }

    public string UserName { get; }
    public bool IsAdmin { get; }

    public bool CanSee(string compartment) => IsAdmin || _groups.Contains(compartment);

    public static UserAccess FromPrincipal(ClaimsPrincipal principal, string groupClaim, string adminGroup)
    {
        var groups = principal.FindAll(groupClaim).Select(c => c.Value).ToList();
        var isAdmin = groups.Contains(adminGroup, StringComparer.OrdinalIgnoreCase);
        return new UserAccess(principal.Identity?.Name ?? "", isAdmin, groups);
    }

    /// <summary>Scoped service factory: builds the access of the user of the current request.</summary>
    public static UserAccess FromServices(IServiceProvider services)
    {
        var httpContext = services.GetRequiredService<IHttpContextAccessor>().HttpContext
                          ?? throw new InvalidOperationException("UserAccess is only available during an HTTP request.");
        var groupClaim = services.GetRequiredService<IOptions<AuthenticationSettings>>().Value.Oidc.GroupClaim;
        var adminGroup = services.GetRequiredService<IOptions<AccessOptions>>().Value.AdminGroup;
        return FromPrincipal(httpContext.User, groupClaim, adminGroup);
    }
}
