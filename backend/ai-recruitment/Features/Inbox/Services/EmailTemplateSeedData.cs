namespace ai_recruitment.Features.Inbox.Services
{
    // The 4 default templates. Seeded once (insert-only, by Key) via
    // IEmailTemplateService.SeedDefaultsAsync - see Program.cs. Re-running the seed never
    // duplicates or overwrites a template HR has since edited.
    public static class EmailTemplateSeedData
    {
        public record Entry(string Key, string Name, string Subject, string BodyHtml, List<string> Variables, int SortOrder);

        public static readonly IReadOnlyList<Entry> Defaults =
        [
            new Entry(
                "interview_invitation",
                "Interview Invitation",
                "Congratulations! You've Advanced to the Next Stage",
                "<p>Hi {{recipient_first_name|there}},</p>"
                + "<p>Congratulations! We're pleased to inform you that you've successfully passed the previous stage of our recruitment process and are moving forward to the next stage.</p>"
                + "<p>We'd like to invite you to an interview to discuss your experience, skills, and qualifications in more detail.</p>"
                + "<p>Our HR team will arrange your interview schedule and send you a calendar invitation with the confirmed date and time.</p>"
                + "<p>If the proposed schedule doesn't work for you, kindly reply to this email with your preferred date and time. We'll check availability and get back to you with confirmation.</p>"
                + "<p>Congratulations again on progressing in our recruitment process! We look forward to speaking with you.</p>"
                + "<p>Best regards,<br>HR Recruitment Team</p>",
                ["recipient_first_name"],
                1),

            new Entry(
                "rejection_notice",
                "Rejection Notice",
                "Update on Your Application",
                "<p>Hi {{recipient_first_name|there}},</p>"
                + "<p>Thank you for taking the time to apply and for your interest in our company. After careful consideration, we've decided to move forward with other candidates whose experience more closely matches the role.</p>"
                + "<p>We'll keep your profile on file for future openings.</p>"
                + "<p>Kind regards,<br>HR Recruitment Team</p>",
                ["recipient_first_name"],
                2),

            new Entry(
                "job_offer",
                "Job Offer",
                "Job Offer – Welcome Aboard!",
                "<p>Hi {{recipient_first_name|there}},</p>"
                + "<p>We're delighted to offer you the position! Attached you'll find the offer letter with the compensation and start date details.</p>"
                + "<p>Please review it and let us know if you have any questions. We're excited to have you on the team.</p>"
                + "<p>Best regards,<br>HR Recruitment Team</p>",
                ["recipient_first_name"],
                3),

            new Entry(
                "request_documents",
                "Request for Documents",
                "Request for Pre-Employment Documents",
                "<p>Hi {{recipient_first_name|there}},</p>"
                + "<p>To continue with your application, please send us the following documents:</p>"
                + "<ul><li>Government-issued ID</li><li>Certificate of Employment from previous employers</li><li>Transcript of Records</li></ul>"
                + "<p>You can reply to this email with the files attached.</p>"
                + "<p>Thank you,<br>HR Recruitment Team</p>",
                ["recipient_first_name"],
                4),
        ];
    }
}
