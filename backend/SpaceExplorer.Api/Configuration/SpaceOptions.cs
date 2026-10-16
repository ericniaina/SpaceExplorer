namespace SpaceExplorer.Api.Configuration;

/// <summary>One disk space whose consumption is read from a CSV produced by the batch.</summary>
public sealed class SpaceOptions
{
    public const string Section = "Spaces";

    public string Key { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string CsvPath { get; set; } = "";
    public string BasePath { get; set; } = "";
    public string Encoding { get; set; } = "utf-8";

    public static bool AreValid(List<SpaceOptions> spaces) =>
        spaces.Count > 0
        && spaces.All(s => !string.IsNullOrWhiteSpace(s.Key)
                           && !string.IsNullOrWhiteSpace(s.CsvPath)
                           && !string.IsNullOrWhiteSpace(s.BasePath)
                           && IsKnownEncoding(s.Encoding))
        && spaces.Select(s => s.Key).Distinct(StringComparer.OrdinalIgnoreCase).Count() == spaces.Count;

    private static bool IsKnownEncoding(string name)
    {
        try
        {
            System.Text.Encoding.GetEncoding(name);
            return true;
        }
        catch (ArgumentException)
        {
            return false;
        }
    }
}
