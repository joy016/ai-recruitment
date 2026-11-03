namespace ai_recruitment.Features.Inbox.Services
{
    public static class InboxAttachmentPolicy
    {
        public const long MaxTotalBytesPerEmail = 20 * 1024 * 1024;
        public const long MaxSingleFileBytes = MaxTotalBytesPerEmail;

        private static readonly HashSet<string> BlockedExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".exe", ".bat", ".cmd", ".com", ".msi", ".msp", ".scr", ".ps1", ".psm1",
            ".vbs", ".vbe", ".js", ".jse", ".wsf", ".wsh", ".sh", ".bash", ".app",
            ".dll", ".jar", ".apk", ".gadget", ".cpl", ".reg",
        };

        public static bool IsBlockedFilename(string filename)
        {
            var extension = Path.GetExtension(filename);
            return !string.IsNullOrEmpty(extension) && BlockedExtensions.Contains(extension);
        }
    }
}
