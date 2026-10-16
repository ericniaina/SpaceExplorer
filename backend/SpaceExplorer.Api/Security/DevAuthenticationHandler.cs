using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using SpaceExplorer.Api.Configuration;

namespace SpaceExplorer.Api.Security;

/// <summary>
/// Development only: authenticates every request as the profile named by <c>Authentication:DevUser</c>.
/// Editing appsettings.Development.json switches the user without restarting.
/// </summary>
public sealed class DevAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IOptionsMonitor<AuthenticationSettings> settings)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Development";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var current = settings.CurrentValue;
        if (!current.DevUsers.TryGetValue(current.DevUser, out var user))
        {
            return Task.FromResult(AuthenticateResult.Fail($"Unknown development user profile '{current.DevUser}'."));
        }

        var nameClaim = current.Oidc.NameClaim;
        var groupClaim = current.Oidc.GroupClaim;
        var claims = new List<Claim> { new(nameClaim, user.Name) };
        claims.AddRange(user.Groups.Select(g => new Claim(groupClaim, g)));

        var identity = new ClaimsIdentity(claims, SchemeName, nameClaim, groupClaim);
        var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
