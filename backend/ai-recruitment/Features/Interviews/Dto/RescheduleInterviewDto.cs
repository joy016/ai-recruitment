using System.ComponentModel.DataAnnotations;

namespace ai_recruitment.Features.Interviews.Dto
{
    public class RescheduleInterviewDto
    {
        [Required]
        public DateTime NewInterviewDateTime { get; set; }
    }
}
