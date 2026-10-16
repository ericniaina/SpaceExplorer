namespace SpaceExplorer.Api.Configuration;

public sealed class DataRefreshOptions
{
    public const string Section = "DataRefresh";

    /// <summary>Minimum delay between two checks of a CSV file's modification date.</summary>
    public int CheckIntervalMinutes { get; set; } = 10;
}
