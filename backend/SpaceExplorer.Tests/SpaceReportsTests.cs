using SpaceExplorer.Api.Data;
using SpaceExplorer.Api.Reports;
using SpaceExplorer.Api.Security;

namespace SpaceExplorer.Tests;

public class SpaceReportsTests
{
    // Space total = 1000:
    //   C1 = 600 (W1 = 400 from its jobs total line, W2 = 200)
    //   C2 = 300 (W3 has no jobs total line: 100 + 200)
    //   C3 = 100
    private static readonly SpaceEntry[] Entries =
    [
        new(@"X:\C1\W1\jobs", "C1", "W1", null, 400),
        new(@"X:\C1\W1\jobs\J1", "C1", "W1", "J1", 300),
        new(@"X:\C1\W1\jobs\J2", "C1", "W1", "J2", 50),
        new(@"X:\C1\W2\jobs", "C1", "W2", null, 200),
        new(@"X:\C2\W3\jobs\J3", "C2", "W3", "J3", 100),
        new(@"X:\C2\W3\jobs\J4", "C2", "W3", "J4", 200),
        new(@"X:\C3\W4\jobs", "C3", "W4", null, 100),
    ];

    private static readonly UserAccess Admin = new("admin", isAdmin: true, ["Admin"]);
    private static readonly UserAccess C1User = new("user", isAdmin: false, ["c1", "UnknownGroup"]);
    private static readonly UserAccess NoAccess = new("none", isAdmin: false, []);

    [Fact]
    public void Workspace_size_uses_jobs_total_line_and_never_adds_job_lines()
    {
        var c1 = SpaceReports.Workspaces(Entries, Admin, includeJobs: false).Single(c => c.Name == "C1");

        Assert.Equal(600, c1.Size);
        Assert.Equal(400, c1.Workspaces.Single(w => w.Name == "W1").Size);
    }

    [Fact]
    public void Workspace_without_jobs_total_line_falls_back_to_sum_of_jobs()
    {
        var c2 = SpaceReports.Workspaces(Entries, Admin, includeJobs: false).Single(c => c.Name == "C2");

        Assert.Equal(300, Assert.Single(c2.Workspaces).Size);
    }

    [Fact]
    public void Admin_sees_every_compartment_without_others_row()
    {
        var report = SpaceReports.Compartments(Entries, Admin);

        Assert.Equal(1000, report.SpaceTotal);
        Assert.Equal(["C1", "C2", "C3"], report.Rows.Select(r => r.Name));
        Assert.DoesNotContain(report.Rows, r => r.IsOthers);
        Assert.Equal(60, report.Rows[0].Percent, precision: 6);
    }

    [Fact]
    public void User_sees_own_compartments_and_others_merged_relative_to_whole_space()
    {
        var report = SpaceReports.Compartments(Entries, C1User);

        Assert.Equal(1000, report.SpaceTotal);
        Assert.Collection(report.Rows,
            r => Assert.Equal(("C1", 600L, 60.0, false), (r.Name, r.Size, r.Percent, r.IsOthers)),
            r => Assert.Equal(((string?)null, 400L, 40.0, true), (r.Name, r.Size, r.Percent, r.IsOthers)));
    }

    [Fact]
    public void User_without_compartment_only_gets_others_row()
    {
        var row = Assert.Single(SpaceReports.Compartments(Entries, NoAccess).Rows);

        Assert.True(row.IsOthers);
        Assert.Null(row.Name);
        Assert.Equal(1000, row.Size);
        Assert.Equal(100, row.Percent, precision: 6);
    }

    [Fact]
    public void Line_pages_only_contain_visible_compartments()
    {
        Assert.All(SpaceReports.Raw(Entries, C1User), r => Assert.StartsWith(@"X:\C1\", r.Path));
        Assert.All(SpaceReports.Split(Entries, C1User), r => Assert.Equal("C1", r.Compartment));
        Assert.Equal(["W1", "W2"], SpaceReports.JobsTotals(Entries, C1User).Select(r => r.Workspace));
        Assert.Empty(SpaceReports.Raw(Entries, NoAccess));
    }

    [Fact]
    public void Split_puts_jobs_total_line_before_its_jobs()
    {
        var w1 = SpaceReports.Split(Entries, Admin).Where(r => r.Workspace == "W1").Select(r => r.Job);

        Assert.Equal([null, "J1", "J2"], w1);
    }

    [Fact]
    public void Workspaces_report_percentages_relative_to_parent()
    {
        var c1 = SpaceReports.Workspaces(Entries, C1User, includeJobs: true).Single();

        Assert.Equal(60, c1.PercentOfSpace, precision: 6);
        var w1 = c1.Workspaces[0];
        Assert.Equal(("W1", 400 * 100.0 / 600), (w1.Name, w1.Percent));
        Assert.Equal(["J1", "J2"], w1.Jobs!.Select(j => j.Name));
        Assert.Equal(75, w1.Jobs![0].Percent, precision: 6);
    }

    [Fact]
    public void Jobs_are_omitted_unless_requested()
    {
        var c1 = SpaceReports.Workspaces(Entries, Admin, includeJobs: false).First();

        Assert.All(c1.Workspaces, w => Assert.Null(w.Jobs));
    }

    [Fact]
    public void Empty_space_has_zero_percentages()
    {
        var report = SpaceReports.Compartments([new(@"X:\C1\W1\jobs", "C1", "W1", null, 0)], Admin);

        Assert.Equal(0, Assert.Single(report.Rows).Percent);
    }
}
