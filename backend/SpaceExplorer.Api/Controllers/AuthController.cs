using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using SpaceExplorer.Api.Configuration;

namespace SpaceExplorer.Api.Controllers;

/// <summary>Browser navigation endpoints (not XHR): start the SSO login, or sign out of the app and the SSO.</summary>
[ApiController]
[Route("auth")]
public sealed class AuthController(IOptions<AuthenticationSettings> settings) : ControllerBase
{
    private bool IsDevelopmentMode => settings.Value.Mode == AuthenticationMode.Development;

    [HttpGet("login")]
    [AllowAnonymous]
    public IActionResult Login([FromQuery] string? returnUrl)
    {
        // Local URLs only: prevents open redirects.
        var target = Url.IsLocalUrl(returnUrl) ? returnUrl! : "/";
        if (IsDevelopmentMode)
        {
            return LocalRedirect(target);
        }

        return Challenge(new AuthenticationProperties { RedirectUri = target }, OpenIdConnectDefaults.AuthenticationScheme);
    }

    [HttpGet("logout")]
    [AllowAnonymous]
    public IActionResult Logout()
    {
        if (IsDevelopmentMode || User.Identity?.IsAuthenticated != true)
        {
            return LocalRedirect("/");
        }

        return SignOut(
            new AuthenticationProperties { RedirectUri = "/" },
            CookieAuthenticationDefaults.AuthenticationScheme,
            OpenIdConnectDefaults.AuthenticationScheme);
    }
}
