using System.Text;
using System.Text.Json.Serialization;
using SpaceExplorer.Api;
using SpaceExplorer.Api.Configuration;
using SpaceExplorer.Api.Data;
using SpaceExplorer.Api.Security;

// Allows CSV files encoded in Windows code pages (e.g. "windows-1252").
Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOptions<List<SpaceOptions>>()
    .Bind(builder.Configuration.GetSection(SpaceOptions.Section))
    .PostConfigure(spaces =>
    {
        // Relative CSV paths (sample data in development) are resolved from the content root.
        foreach (var space in spaces.Where(s => s.CsvPath.Length > 0 && !Path.IsPathRooted(s.CsvPath)))
        {
            space.CsvPath = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, space.CsvPath));
        }
    })
    .Validate(SpaceOptions.AreValid, "Spaces: each space needs a unique Key, a CsvPath, a BasePath and a valid Encoding.")
    .ValidateOnStart();
builder.Services.Configure<DataRefreshOptions>(builder.Configuration.GetSection(DataRefreshOptions.Section));
builder.Services.Configure<AccessOptions>(builder.Configuration.GetSection(AccessOptions.Section));

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<ISpaceDataProvider, SpaceDataCache>();

builder.Services.AddSpaceExplorerAuthentication(builder.Configuration, builder.Environment);
builder.Services.AddAuthorization();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped(UserAccess.FromServices);

builder.Services.AddControllers()
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<SpaceDataUnavailableHandler>();

if (builder.Environment.IsDevelopment())
{
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();
}

var app = builder.Build();

app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

// Angular production build, copied to wwwroot.
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
// Unknown API routes must answer 404, not the SPA index.
app.Map("/api/{**path}", () => Results.NotFound());
app.MapFallbackToFile("index.html");

app.Run();

/// <summary>Entry point, exposed for integration tests.</summary>
public partial class Program;
