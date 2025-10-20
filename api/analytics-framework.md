# AI Survey MVP - Analytics Framework

## Database Structure Overview

### Core Tables:
- **organizations** - Company/tenant data
- **users** - User accounts and authentication
- **sessions** - Survey sessions
- **project_briefs** - Generated project briefs
- **solutions** - Work breakdown structures
- **solution_epics/stories/tasks** - Hierarchical work items
- **conversation_history** - AI conversation tracking
- **jira_connections** - External integrations
- **pm_templates** - Project management templates

## Comprehensive Analytics Data Points (65+ Metrics)

### 📊 ORGANIZATIONAL ANALYTICS

#### Growth & Adoption Metrics
1. **Total Organizations** - Count of active organizations
2. **New Organizations by Period** - Growth rate tracking
3. **Organization Churn Rate** - Organizations that became inactive
4. **Plan Distribution** - Trial vs paid plan breakdown
5. **Seat Utilization** - (seats_used / seats_total) per org
6. **Average Team Size** - seats_used across organizations
7. **Organization Lifespan** - Days since organization creation

#### Feature Adoption
8. **Jira Integration Adoption** - % orgs with jira_connections
9. **Custom Template Usage** - % orgs with custom pm_templates
10. **Document Branding Usage** - % orgs with customized document_settings
11. **Advanced Features Usage** - Custom prioritization frameworks

### 👥 USER ANALYTICS

#### User Engagement
12. **Total Active Users** - Users with recent activity
13. **User Growth Rate** - New user registrations over time
14. **User Retention Rate** - Users active after 30/60/90 days
15. **Average Sessions per User** - Engagement intensity
16. **User Role Distribution** - Admin/Reviewer/Member breakdown
17. **MFA Adoption Rate** - Security-conscious users
18. **Email Verification Rate** - Account completion rate

#### User Productivity
19. **Briefs per User** - Individual productivity measure
20. **Solutions Generated per User** - Solution creation activity
21. **Time to First Brief** - User onboarding efficiency
22. **Most Active Users** - Power user identification

### 🎯 SURVEY & CONVERSATION ANALYTICS

#### Survey Performance
23. **Total Survey Sessions** - Overall platform usage
24. **Session Completion Rate** - % of completed surveys
25. **Average Questions per Session** - Survey depth
26. **Session Duration Distribution** - Time investment patterns
27. **Abandoned Session Rate** - Drop-off analysis
28. **Questions per Completed Session** - Survey efficiency

#### AI Conversation Quality
29. **Average AI Confidence Score** - AI performance tracking
30. **Conversation Topics Coverage** - Breadth of discussions
31. **Question Type Distribution** - Open vs structured questions
32. **AI Insight Generation Rate** - Insights per conversation
33. **Conversation Turn Analysis** - Interaction patterns
34. **Stop Reason Analysis** - Why conversations end

#### Content Quality
35. **Brief Completion Percentage** - Content completeness
36. **Average Brief Length** - Content depth
37. **Requirements Extraction Rate** - AI effectiveness
38. **Stakeholder Identification Rate** - Key player recognition
39. **KPI Identification Rate** - Success metric extraction

### 🛠️ SOLUTION ENGINEERING ANALYTICS

#### Solution Generation
40. **Total Solutions Created** - Platform output
41. **Solutions per Brief** - Conversion rate
42. **Solution Status Distribution** - Draft/Approved/In Progress/Completed
43. **Average Solution Complexity** - complexity_score analysis
44. **Estimated Duration Distribution** - Project size patterns
45. **Effort Points Distribution** - Work estimation patterns

#### Work Breakdown Structure
46. **Epics per Solution** - Solution scope analysis
47. **Stories per Epic** - Feature decomposition
48. **Tasks per Story** - Work granularity
49. **Story Type Distribution** - User story vs technical vs spike
50. **Task Type Distribution** - Development/Testing/Documentation mix
51. **Priority Distribution** - Priority 1-5 breakdown across epics/stories

#### Estimation Analysis
52. **Total Estimated Hours** - Aggregate work estimates
53. **Average Hours per Task** - Estimation granularity
54. **Story Points Distribution** - Agile estimation patterns
55. **Complexity vs Duration Correlation** - Estimation accuracy

### 🏗️ ARCHITECTURE & REQUIREMENTS

#### Architecture Patterns
56. **Component Type Distribution** - Frontend/Backend/Database/Integration
57. **Technology Stack Popularity** - Most used technologies
58. **Architecture Complexity** - Components per solution
59. **Dependency Analysis** - Inter-component relationships

#### Requirements Analysis
60. **Requirement Type Distribution** - Functional/Technical/Security/Performance
61. **Requirements per Solution** - Thoroughness metric
62. **Priority vs Type Correlation** - Critical requirement patterns
63. **Acceptance Criteria Completeness** - Quality metric

### 🔗 INTEGRATION & EXPORT ANALYTICS

#### Jira Integration
64. **Jira Export Success Rate** - Integration reliability
65. **Issues Created per Export** - Export volume
66. **Export Processing Time** - Performance metric
67. **Epic/Story/Task Creation Ratios** - Export patterns

### 📈 BUSINESS INTELLIGENCE

#### Revenue & Growth
68. **Monthly Recurring Revenue (MRR)** - Business health
69. **Customer Lifetime Value** - Long-term value
70. **Feature Usage vs Plan Type** - Upsell opportunities
71. **Time to Value** - Onboarding success

#### Operational Efficiency
72. **Support Ticket Correlation** - Feature pain points
73. **API Usage Patterns** - System load analysis
74. **Error Rate by Feature** - Quality metrics
75. **Performance Bottlenecks** - Optimization targets

## Recommended Dashboard Sections

### 1. Executive Dashboard
- Key metrics overview
- Growth trends
- Revenue indicators
- User adoption

### 2. Product Analytics
- Feature usage
- User engagement
- Conversion funnels
- Quality metrics

### 3. AI Performance
- Conversation quality
- Insight generation
- Content extraction
- User satisfaction

### 4. Engineering Insights
- Solution patterns
- Estimation accuracy
- Technology trends
- Architecture patterns

### 5. Operations
- System performance
- Integration health
- Error monitoring
- Support metrics
