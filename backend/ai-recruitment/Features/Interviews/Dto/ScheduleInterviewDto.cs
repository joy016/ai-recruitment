using System.ComponentModel.DataAnnotations;

namespace ai_recruitment.Features.Interviews.Dto
{
    public class ScheduleInterviewDto
    {
        [Required]
        public Guid CandidateId { get; set; }

        [Required]
        public DateTime InterviewDateTime { get; set; }

        public Guid? InterviewerId { get; set; }
    }
}
