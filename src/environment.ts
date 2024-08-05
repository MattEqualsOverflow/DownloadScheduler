import * as dotenv from "dotenv";
dotenv.config();

const NotionToken = process.env.NOTION_TOKEN;
const NotionDatabase = process.env.NOTION_DATABASE;
const Url1337X = process.env.URL_1337X ?? "https://www.1337x.to/sort-search/%search%/time/desc/1/";
const UrlNyaa = process.env.URL_NYAA ?? "https://nyaa.si/?f=0&c=1_2&q=%search%";
const DatabaseReloadSchedule = process.env.DATABASE_RELOAD_SCHEDULE ?? "0 */5 * * * *" // Checks for new downloads every 5 minutes
const IpCheckSchedule = process.env.IP_CHECK_SCHEDULE ?? "0 */15 * * * *";  // Checks IP address every 15 minutes
const CleanupDays = Number(process.env.CLEANUP_DAYS?.trim() ?? "30"); // Deletes completed downloads after 30 days
const CheckDownloadStatusSchedule = process.env.CHECK_DOWNLOAD_STATUS_SCHEDULE ?? "30 * * * * *"; // The 30 second mark of every minute
const Debug = process.env.DEBUG?.toLowerCase() == "y" || process.env.DEBUG?.toLowerCase() == "true";
const LogPath = process.env.LOG_PATH ?? "../logs/log_%DATE%.log";
const DownloadCronPrefix = process.env.DOWNLOAD_CRON_PREFIX?.trim() ?? "0 */15 * * *"; // Searches for downloads every 15 minutes
const DownloadPathPrefix = process.env.DOWNLOAD_PATH_PREFIX?.trim() ?? "/data/"; // Where to download files to
const TransmissionHost = process.env.TRANSMISSION_HOST?.trim() ?? "transmission"; // The name of the 
const TransmissionPort = Number(process.env.TRANSMISSION_PORT?.trim() ?? "9091");
const TransmissionIpApiPort = Number(process.env.TRANSMISSION_IP_API_PORT?.trim() ?? "4010");

export {
    NotionToken,
    NotionDatabase,
    Url1337X,
    UrlNyaa,
    DatabaseReloadSchedule,
    IpCheckSchedule,
    CleanupDays,
    Debug,
    LogPath,
    DownloadCronPrefix,
    CheckDownloadStatusSchedule,
    DownloadPathPrefix,
    TransmissionHost,
    TransmissionPort,
    TransmissionIpApiPort
}