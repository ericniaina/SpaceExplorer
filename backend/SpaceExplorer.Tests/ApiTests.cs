using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using SpaceExplorer.Api.Reports;

namespace SpaceExplorer.Tests;

/// <summary>End-to-end through the HTTP pipeline, with the development authentication handler.</summary>
public sealed class ApiTests : IDisposable
{
    private readonly string _directory = Directory.CreateTempSubdirectory("space-explorer-api").FullName;
    private readonly WebApplicationFactory<Program> _factory = new();

    public ApiTests()
    {
        File.WriteAllLines(Path.Combine(_directory, "a.csv"),
        [
            @"D:\A\Compartiment1\W1\jobs;600",
            @"D:\A\Compartiment1\W1\jobs\Job1;500",
            @"D:\A\Compartiment2\W2\jobs;300",
            @"D:\A\Compartiment4\W3\jobs;100",
        ]);
        File.WriteAllLines(Path.Combine(_directory, "b.csv"),
        [
            @"E:\B\Compartiment1\W1\jobs;10",
            @"E:\B\Compartiment5\W5\jobs;20",
        ]);
    }

    public void Dispose()
    {
        _factory.Dispose();
        Directory.Delete(_directory, recursive: true);
    }

    private HttpClient ClientAs(string devUser, string? csvPath = null) =>
        _factory.WithWebHostBuilder(builder => builder
                .UseEnvironment("Development")
                .UseSetting("Spaces:0:CsvPath", csvPath ?? Path.Combine(_directory, "a.csv"))
                .UseSetting("Spaces:0:BasePath", @"D:\A")
                .UseSetting("Spaces:1:CsvPath", Path.Combine(_directory, "b.csv"))
                .UseSetting("Spaces:1:BasePath", @"E:\B")
                .UseSetting("Authentication:DevUser", devUser))
            .CreateClient();

    [Fact]
    public async Task Compartments_hide_other_names_for_regular_user()
    {
        var response = await ClientAs("multi").GetFromJsonAsync<SpaceResponse<CompartmentReport>>("/api/spaces/a/compartments");

        Assert.NotNull(response);
        Assert.Equal("Espace A", response.SpaceName);
        Assert.Collection(response.Data.Rows,
            r => Assert.Equal(("Compartiment1", 600L, false), (r.Name, r.Size, r.IsOthers)),
            r => Assert.Equal(((string?)null, 400L, true), (r.Name, r.Size, r.IsOthers)));
    }

    [Fact]
    public async Task Raw_json_never_contains_hidden_compartment_names()
    {
        var client = ClientAs("multi");

        foreach (var url in new[] { "raw", "split", "jobs-totals", "compartments", "workspaces?includeJobs=true" })
        {
            var json = await client.GetStringAsync($"/api/spaces/A/{url}");
            Assert.DoesNotContain("Compartiment2", json);
            Assert.DoesNotContain("Compartiment4", json);
            Assert.DoesNotContain("Compartiment5", json);
        }
    }

    [Fact]
    public async Task User_without_compartment_gets_only_others_row()
    {
        var response = await ClientAs("none").GetFromJsonAsync<SpaceResponse<CompartmentReport>>("/api/spaces/A/compartments");

        var row = Assert.Single(response!.Data.Rows);
        Assert.True(row.IsOthers);
        Assert.Equal(1000, row.Size);
    }

    [Fact]
    public async Task Me_returns_visible_compartments()
    {
        var me = await ClientAs("multi").GetFromJsonAsync<MeResponse>("/api/me");

        Assert.Equal(("dev.user", false), (me!.UserName, me.IsAdmin));
        Assert.Equal(["Compartiment1"], me.Compartments);
    }

    [Fact]
    public async Task Unknown_space_is_404()
    {
        var response = await ClientAs("admin").GetAsync("/api/spaces/Z/raw");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Unknown_api_route_is_404_not_the_spa()
    {
        var response = await ClientAs("admin").GetAsync("/api/does-not-exist");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Unreadable_csv_is_503()
    {
        var response = await ClientAs("admin", Path.Combine(_directory, "missing.csv")).GetAsync("/api/spaces/A/raw");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }
}
