/**
 * Repositories Index
 * 
 * Exports all repository classes and instances
 */

export { BaseRepository } from './base.repository.js';
export { SessionRepository, sessionRepository } from './session.repository.js';
export { AnswerRepository, answerRepository } from './answer.repository.js';
export { FactsRepository, factsRepository } from './facts.repository.js';
export { BriefRepository, briefRepository } from './brief.repository.js';
export { CampaignRepository, campaignRepository } from './campaign.repository.js';
export { SurveyFlowRepository, surveyFlowRepository } from './surveyFlow.repository.js';
export { SurveyLinkRepository, surveyLinkRepository } from './surveyLink.repository.js';
export { SolutionRepository, solutionRepository } from './solution.repository.js';
export { OrganizationRepository, organizationRepository } from './organization.repository.js';

// Import instances for default export
import { sessionRepository } from './session.repository.js';
import { answerRepository } from './answer.repository.js';
import { factsRepository } from './facts.repository.js';
import { briefRepository } from './brief.repository.js';
import { campaignRepository } from './campaign.repository.js';
import { surveyFlowRepository } from './surveyFlow.repository.js';
import { surveyLinkRepository } from './surveyLink.repository.js';
import { solutionRepository } from './solution.repository.js';
import { organizationRepository } from './organization.repository.js';

export default {
  sessionRepository,
  answerRepository,
  factsRepository,
  briefRepository,
  campaignRepository,
  surveyFlowRepository,
  surveyLinkRepository,
  solutionRepository,
  organizationRepository
};
