using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using SpaceExplorer.Api.Data;

namespace SpaceExplorer.Api;

/// <summary>Turns an unreadable CSV (never loaded) into a 503 with a French message for the UI.</summary>
public sealed class SpaceDataUnavailableHandler(IProblemDetailsService problemDetails) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is not SpaceDataUnavailableException unavailable)
        {
            return false;
        }

        httpContext.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = new ProblemDetails
            {
                Status = StatusCodes.Status503ServiceUnavailable,
                Title = $"Les données de l'espace {unavailable.SpaceKey} sont indisponibles. Réessayez plus tard.",
            },
        });
    }
}
