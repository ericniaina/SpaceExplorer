using SpaceExplorer.Api.Data;

namespace SpaceExplorer.Tests;

public class CsvSpaceParserTests
{
    private const string BasePath = @"D:\Data\SpaceA";

    private static CsvParseResult Parse(params string[] lines) =>
        CsvSpaceParser.Parse(new StringReader(string.Join("\r\n", lines)), BasePath);

    [Fact]
    public void Parses_jobs_total_and_job_lines()
    {
        var result = Parse(
            @"D:\Data\SpaceA\Comp1\Ws1\jobs;300",
            @"D:\Data\SpaceA\Comp1\Ws1\jobs\JobX;120");

        Assert.Empty(result.Skipped);
        Assert.Collection(result.Entries,
            e =>
            {
                Assert.Equal(("Comp1", "Ws1", (string?)null, 300L, EntryKind.JobsTotal), (e.Compartment, e.Workspace, e.Job, e.Size, e.Kind));
                Assert.Equal(@"D:\Data\SpaceA\Comp1\Ws1\jobs", e.FullPath);
            },
            e => Assert.Equal(("Comp1", "Ws1", (string?)"JobX", 120L, EntryKind.Job), (e.Compartment, e.Workspace, e.Job, e.Size, e.Kind)));
    }

    [Fact]
    public void Splits_on_last_semicolon_because_paths_may_contain_one()
    {
        var entry = Assert.Single(Parse(@"D:\Data\SpaceA\Comp1\Ws;1\jobs\Job;2;42").Entries);

        Assert.Equal("Ws;1", entry.Workspace);
        Assert.Equal("Job;2", entry.Job);
        Assert.Equal(42, entry.Size);
    }

    [Fact]
    public void Base_path_and_jobs_folder_are_case_insensitive_and_trailing_separators_ignored()
    {
        var result = CsvSpaceParser.Parse(new StringReader(@"d:\data\spacea\Comp1\Ws1\JOBS\;10"), BasePath + @"\");

        var entry = Assert.Single(result.Entries);
        Assert.Equal(EntryKind.JobsTotal, entry.Kind);
    }

    [Fact]
    public void Ignores_blank_lines()
    {
        var result = Parse("", @"D:\Data\SpaceA\Comp1\Ws1\jobs;1", "   ");

        Assert.Single(result.Entries);
        Assert.Empty(result.Skipped);
    }

    [Theory]
    [InlineData(@"D:\Data\SpaceA\Comp1\Ws1\jobs")]                 // no separator
    [InlineData(@"D:\Data\SpaceA\Comp1\Ws1\jobs;abc")]             // size not a number
    [InlineData(@"D:\Data\SpaceA\Comp1\Ws1\jobs;-5")]              // negative size
    [InlineData(@"E:\Other\Comp1\Ws1\jobs;10")]                    // other base path
    [InlineData(@"D:\Data\SpaceAB\Comp1\Ws1\jobs;10")]             // base path prefix only
    [InlineData(@"D:\Data\SpaceA\Comp1\Ws1;10")]                   // too short
    [InlineData(@"D:\Data\SpaceA\Comp1\Ws1\other;10")]             // not a jobs folder
    [InlineData(@"D:\Data\SpaceA\Comp1\Ws1\jobs\Job\file.txt;10")] // too deep
    [InlineData(@"D:\Data\SpaceA\Comp1\\jobs;10")]                 // empty segment
    public void Skips_invalid_lines_with_their_line_number(string line)
    {
        var result = Parse(@"D:\Data\SpaceA\Comp1\Ws1\jobs;1", line);

        Assert.Single(result.Entries);
        var skipped = Assert.Single(result.Skipped);
        Assert.Equal(2, skipped.LineNumber);
        Assert.Equal(line, skipped.Content);
    }
}
