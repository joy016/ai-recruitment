import type {
  Contact,
  InboxThread,
  MockCandidate,
} from "../(types)/inbox.types";

// DESIGN-ONLY mock data. TODO(wire-up): replace with the mail API.

export const CURRENT_USER: Contact = {
  name: "HR Recruitment Team",
  email: "hr@airecruitment.com",
};

export const MOCK_CANDIDATES: MockCandidate[] = [
  {
    id: "e3959190-d75e-40f5-87f5-a723239ff05a",
    name: "Oliver Santos",
    email: "oliver.santos@gmail.com",
    jobTitle: "Backend .NET Developer",
    yearsOfExperience: 4,
    status: "Rejected",
    interviewSchedule: null,
  },
  {
    id: "7b1f0c52-2f0e-4b8e-9b55-1c4c3f0a9d21",
    name: "Edijoy Lejas",
    email: "edijoy.lejas@gmail.com",
    jobTitle: "Full Stack Developer",
    yearsOfExperience: 5,
    status: "Final Interview",
    interviewSchedule: "2026-11-04T02:00:00Z",
  },
  {
    id: "a2c4e6f8-1111-4a2b-8c3d-5e6f7a8b9c01",
    name: "Maria Reyes",
    email: "maria.reyes@outlook.com",
    jobTitle: "QA Automation Engineer",
    yearsOfExperience: 3,
    status: "Technical Interview",
    interviewSchedule: "2026-11-02T06:30:00Z",
  },
  {
    id: "b3d5f7a9-2222-4b3c-9d4e-6f7a8b9c0d12",
    name: "Joshua Cruz",
    email: "joshua.cruz@yahoo.com",
    jobTitle: "UI/UX Designer",
    yearsOfExperience: 2,
    status: "Initial Interview",
    interviewSchedule: "2026-11-05T01:00:00Z",
  },
  {
    id: "c4e6a8b0-3333-4c4d-8e5f-7a8b9c0d1e23",
    name: "Angela Dela Rosa",
    email: "angela.delarosa@gmail.com",
    jobTitle: "Product Manager",
    yearsOfExperience: 7,
    status: "Job Offer",
    interviewSchedule: null,
  },
  {
    id: "d5f7b9c1-4444-4d5e-9f6a-8b9c0d1e2f34",
    name: "Mark Villanueva",
    email: "mark.villanueva@gmail.com",
    jobTitle: "DevOps Engineer",
    yearsOfExperience: 6,
    status: "AI Screening passed",
    interviewSchedule: null,
  },
  {
    id: "e6a8c0d2-5555-4e6f-8a7b-9c0d1e2f3a45",
    name: "Kristine Bautista",
    email: "kristine.bautista@gmail.com",
    jobTitle: "HR Generalist",
    yearsOfExperience: 4,
    status: "Onboarding",
    interviewSchedule: null,
  },
];

const candidateByEmail = new Map(
  MOCK_CANDIDATES.map((candidate) => [candidate.email.toLowerCase(), candidate]),
);

export const findCandidateByEmail = (email: string) =>
  candidateByEmail.get(email.toLowerCase()) ?? null;

const contactOf = (candidate: MockCandidate): Contact => ({
  name: candidate.name,
  email: candidate.email,
});

const [oliver, edijoy, maria, joshua, angela, mark, kristine] =
  MOCK_CANDIDATES.map(contactOf);

const HIRING_MANAGER: Contact = {
  name: "Ramon Aquino",
  email: "ramon.aquino@airecruitment.com",
};
const JOBSTREET: Contact = {
  name: "JobStreet Alerts",
  email: "alerts@jobstreet.com",
};

export const MOCK_THREADS: InboxThread[] = [
  {
    // Multi-message thread.
    id: "t-edijoy-final",
    subject: "Final Interview – Full Stack Developer",
    folder: "inbox",
    labels: ["interviews", "applicants"],
    isStarred: true,
    isUnread: true,
    messages: [
      {
        id: "m-edijoy-1",
        from: CURRENT_USER,
        to: [edijoy],
        cc: [HIRING_MANAGER],
        sentAt: "2026-10-27T03:15:00Z",
        body: "Hi Edijoy,\n\nCongratulations on passing the technical interview! We'd like to invite you to the final interview with our Engineering Manager, Ramon Aquino.\n\nProposed schedule: Monday, November 2, 10:00 AM (Manila time), via Google Meet.\n\nPlease confirm if this works for you.\n\nBest regards,\nHR Recruitment Team",
        attachments: [],
      },
      {
        id: "m-edijoy-2",
        from: edijoy,
        to: [CURRENT_USER],
        sentAt: "2026-10-27T09:42:00Z",
        body: "Hi HR Team,\n\nThank you so much for the invitation! Unfortunately I have a prior commitment on Monday morning. Would it be possible to move the interview to Wednesday, November 4, at the same time?\n\nThank you for understanding.\n\nBest,\nEdijoy",
        attachments: [],
      },
      {
        id: "m-edijoy-3",
        from: CURRENT_USER,
        to: [edijoy],
        cc: [HIRING_MANAGER],
        sentAt: "2026-10-28T02:05:00Z",
        body: "Hi Edijoy,\n\nNo problem at all. We've moved your final interview to Wednesday, November 4, 10:00 AM. A calendar invite with the meeting link will follow shortly.\n\nCould you also send your updated portfolio before the interview?\n\nThanks,\nHR Recruitment Team",
        attachments: [],
      },
      {
        id: "m-edijoy-4",
        from: edijoy,
        to: [CURRENT_USER],
        cc: [HIRING_MANAGER],
        sentAt: "2026-10-30T01:26:00Z",
        body: "Hi HR Team,\n\nConfirmed for Wednesday, November 4, 10:00 AM. I've attached my updated portfolio and resume for reference.\n\nLooking forward to meeting Mr. Aquino!\n\nBest regards,\nEdijoy Lejas",
        attachments: [
          { id: "a-edijoy-1", fileName: "Edijoy_Lejas_Resume.pdf", size: "312 KB", kind: "pdf" },
          { id: "a-edijoy-2", fileName: "Portfolio_2026.pdf", size: "4.1 MB", kind: "pdf" },
        ],
      },
    ],
  },
  {
    id: "t-oliver-feedback",
    subject: "Re: Update on Your Application",
    folder: "inbox",
    labels: ["rejections"],
    isStarred: false,
    isUnread: true,
    messages: [
      {
        id: "m-oliver-1",
        from: CURRENT_USER,
        to: [oliver],
        sentAt: "2026-10-28T08:10:00Z",
        body: "Hi Oliver,\n\nThank you for your interest in the Backend .NET Developer role. After careful consideration, we've decided to move forward with other candidates.\n\nKind regards,\nHR Recruitment Team",
        attachments: [],
      },
      {
        id: "m-oliver-2",
        from: oliver,
        to: [CURRENT_USER],
        sentAt: "2026-10-29T23:48:00Z",
        body: "Hi HR Team,\n\nThank you for letting me know. I'd really appreciate any feedback on my application or interview so I can improve for future opportunities.\n\nI'm also still very interested in other backend roles you may open.\n\nBest regards,\nOliver Santos",
        attachments: [],
      },
    ],
  },
  {
    id: "t-maria-docs",
    subject: "Technical exam submission",
    folder: "inbox",
    labels: ["interviews"],
    isStarred: false,
    isUnread: true,
    messages: [
      {
        id: "m-maria-1",
        from: maria,
        to: [CURRENT_USER],
        sentAt: "2026-10-29T14:20:00Z",
        body: "Good evening,\n\nPlease find attached my solution for the QA automation technical exam. I included a short README explaining how to run the test suite.\n\nThank you,\nMaria Reyes",
        attachments: [
          { id: "a-maria-1", fileName: "QA_Exam_MariaReyes.zip", size: "1.2 MB", kind: "other" },
          { id: "a-maria-2", fileName: "README.docx", size: "48 KB", kind: "doc" },
        ],
      },
    ],
  },
  {
    id: "t-angela-offer",
    subject: "Re: Job Offer – Welcome Aboard!",
    folder: "inbox",
    labels: ["offers"],
    isStarred: true,
    isUnread: false,
    messages: [
      {
        id: "m-angela-1",
        from: angela,
        to: [CURRENT_USER],
        sentAt: "2026-10-29T06:05:00Z",
        body: "Hi HR Team,\n\nThank you for the offer! I've reviewed the letter and I'm happy to accept. I've attached the signed copy.\n\nCould you share the onboarding checklist and my first-day schedule?\n\nWarm regards,\nAngela",
        attachments: [
          { id: "a-angela-1", fileName: "Signed_Offer_Letter.pdf", size: "220 KB", kind: "pdf" },
        ],
      },
    ],
  },
  {
    id: "t-joshua-question",
    subject: "Question about the design assessment",
    folder: "inbox",
    labels: ["applicants"],
    isStarred: false,
    isUnread: false,
    messages: [
      {
        id: "m-joshua-1",
        from: joshua,
        to: [CURRENT_USER],
        sentAt: "2026-10-28T11:30:00Z",
        body: "Hello,\n\nFor the design assessment, should I submit a Figma link or exported PNG files? Also, is there a page limit for the case study?\n\nThanks in advance,\nJoshua",
        attachments: [],
      },
    ],
  },
  {
    id: "t-mark-application",
    subject: "Application – DevOps Engineer",
    folder: "inbox",
    labels: ["applicants"],
    isStarred: false,
    isUnread: true,
    messages: [
      {
        id: "m-mark-1",
        from: mark,
        to: [CURRENT_USER],
        sentAt: "2026-10-28T01:12:00Z",
        body: "Hi,\n\nI'm applying for the DevOps Engineer position. I have six years of experience with AWS, Kubernetes and Terraform, and I've led CI/CD migrations for two product teams.\n\nMy resume is attached. I'd love to discuss how I can help.\n\nRegards,\nMark Villanueva",
        attachments: [
          { id: "a-mark-1", fileName: "Resume.pdf", size: "248 KB", kind: "pdf" },
        ],
      },
    ],
  },
  {
    id: "t-manager-shortlist",
    subject: "Shortlist for Full Stack Developer",
    folder: "inbox",
    labels: ["interviews"],
    isStarred: false,
    isUnread: false,
    messages: [
      {
        id: "m-manager-1",
        from: HIRING_MANAGER,
        to: [CURRENT_USER],
        sentAt: "2026-10-27T07:45:00Z",
        body: "Hi team,\n\nI've reviewed the AI screening results. Let's prioritise Edijoy Lejas and Maria Reyes for the next round. Please send me their updated resumes before Friday.\n\nThanks,\nRamon",
        attachments: [],
      },
    ],
  },
  {
    id: "t-kristine-onboarding",
    subject: "Onboarding documents submitted",
    folder: "inbox",
    labels: ["offers"],
    isStarred: false,
    isUnread: false,
    messages: [
      {
        id: "m-kristine-1",
        from: kristine,
        to: [CURRENT_USER],
        sentAt: "2026-10-25T05:00:00Z",
        body: "Hello HR,\n\nAttached are my NBI clearance, SSS and PhilHealth details for onboarding. Please let me know if anything else is needed.\n\nThank you,\nKristine",
        attachments: [
          { id: "a-kristine-1", fileName: "NBI_Clearance.jpg", size: "860 KB", kind: "image" },
          { id: "a-kristine-2", fileName: "Government_IDs.pdf", size: "540 KB", kind: "pdf" },
        ],
      },
    ],
  },
  {
    id: "t-jobstreet-digest",
    subject: "12 new applicants for Backend .NET Developer",
    folder: "inbox",
    labels: ["applicants"],
    isStarred: false,
    isUnread: false,
    messages: [
      {
        id: "m-jobstreet-1",
        from: JOBSTREET,
        to: [CURRENT_USER],
        sentAt: "2026-10-24T00:30:00Z",
        body: "Your job post \"Backend .NET Developer\" received 12 new applications this week. Log in to review them.",
        attachments: [],
      },
    ],
  },
  {
    id: "t-sent-joshua-invite",
    subject: "Initial Interview Invitation",
    folder: "sent",
    labels: ["interviews"],
    isStarred: false,
    isUnread: false,
    messages: [
      {
        id: "m-sent-joshua-1",
        from: CURRENT_USER,
        to: [joshua],
        sentAt: "2026-10-26T02:00:00Z",
        body: "Hi Joshua,\n\nWe'd like to invite you to an initial interview on Thursday, November 5, 9:00 AM via Google Meet.\n\nBest regards,\nHR Recruitment Team",
        attachments: [],
      },
    ],
  },
  {
    id: "t-draft-mark",
    subject: "Next steps for your application",
    folder: "drafts",
    labels: ["applicants"],
    isStarred: false,
    isUnread: false,
    messages: [
      {
        id: "m-draft-mark-1",
        from: CURRENT_USER,
        to: [mark],
        sentAt: "2026-10-29T03:00:00Z",
        body: "Hi Mark,\n\nThank you for applying. Your profile passed our AI screening, and we'd like to schedule…",
        attachments: [],
      },
    ],
  },
  {
    id: "t-archived-oliver",
    subject: "Technical interview confirmation",
    folder: "archived",
    labels: ["interviews"],
    isStarred: false,
    isUnread: false,
    messages: [
      {
        id: "m-archived-oliver-1",
        from: oliver,
        to: [CURRENT_USER],
        sentAt: "2026-10-20T04:00:00Z",
        body: "Hi,\n\nConfirming my attendance for the technical interview on October 22. Thank you!\n\nOliver",
        attachments: [],
      },
    ],
  },
];

/** Unread inbox threads, for the sidebar badge and header preview. */
export const MOCK_UNREAD_INBOX_COUNT = MOCK_THREADS.filter(
  (thread) => thread.folder === "inbox" && thread.isUnread,
).length;
