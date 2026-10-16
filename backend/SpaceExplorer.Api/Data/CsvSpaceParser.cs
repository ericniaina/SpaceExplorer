using System.Diagnostics.CodeAnalysis;
using System.Globalization;

namespace SpaceExplorer.Api.Data;

public sealed record SkippedLine(int LineNumber, string Content, string Reason);

public sealed record CsvParseResult(IReadOnlyList<SpaceEntry> Entries, IReadOnlyList<SkippedLine> Skipped);

/// <summary>
/// Parses the batch CSV: no header, <c>FullPath;SizeInBytes</c> per line.
/// Lines that do not follow the expected path structure are reported as skipped instead of failing the whole file.
/// </summary>
public static class CsvSpaceParser
{
    private const string JobsFolder = "jobs";

    public static CsvParseResult Parse(TextReader reader, string basePath)
    {
        var prefix = basePath.TrimEnd('\\') + "\\";
        var entries = new List<SpaceEntry>();
        var skipped = new List<SkippedLine>();
        var lineNumber = 0;

        while (reader.ReadLine() is { } line)
        {
            lineNumber++;
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            if (TryParseLine(line, prefix, out var entry, out var reason))
            {
                entries.Add(entry);
            }
            else
            {
                skipped.Add(new SkippedLine(lineNumber, line, reason));
            }
        }

        return new CsvParseResult(entries, skipped);
    }

    private static bool TryParseLine(string line, string prefix, [NotNullWhen(true)] out SpaceEntry? entry, out string reason)
    {
        entry = null;

        // Split on the last ';': a Windows path may legally contain ';'.
        var separator = line.LastIndexOf(';');
        if (separator < 0)
        {
            reason = "missing ';' separator";
            return false;
        }

        var path = line[..separator].Trim();
        if (!long.TryParse(line[(separator + 1)..].Trim(), NumberStyles.None, CultureInfo.InvariantCulture, out var size))
        {
            reason = "size is not a positive integer";
            return false;
        }

        if (!path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            reason = "path does not start with the configured base path";
            return false;
        }

        var segments = path[prefix.Length..].TrimEnd('\\').Split('\\');
        if (segments.Length is < 3 or > 4
            || !segments[2].Equals(JobsFolder, StringComparison.OrdinalIgnoreCase)
            || segments.Any(string.IsNullOrWhiteSpace))
        {
            reason = @"path is not [Compartment]\[Workspace]\jobs[\JobName]";
            return false;
        }

        entry = new SpaceEntry(path, segments[0], segments[1], segments.Length == 4 ? segments[3] : null, size);
        reason = "";
        return true;
    }
}
