# Back Navigation Implementation Plan

## Overview

Enable users to navigate back to any previous question in the survey, change their answer, and have subsequent questions regenerate based on the updated responses.

## Current State

**Frontend:**
- `usePublicSurvey.js` has a stub `goBack()` function that just shows a warning
- Frontend tracks answers in memory as an array
- No UI button currently displayed (but goBack is passed to SurveyStep)

**Backend:**
- Session state includes `current_question_id` 
- Answers stored in `answers` table with `session_id`, `question_id`, `text`
- Conversation history tracks Q&A pairs with turn numbers
- AI generates next question based on all previous answers

## Implementation Strategy

### Phase 1: Backend API Endpoint

**New Endpoint: `POST /api/public/sessions/:sessionId/go-back`**

**Request:**
```json
{
  "targetQuestionIndex": 2  // Index in the answer sequence (0-based)
}
```

**Response:**
```json
{
  "success": true,
  "question": {
    "id": "q2",
    "text": "What specific aspects of the course...",
    "type": "text"
  },
  "currentAnswer": "My previous answer here"
}
```

**Logic:**
1. Query all answers for the session, ordered by `created_at`
2. Find the answer at `targetQuestionIndex`
3. Delete that answer and all subsequent answers from database
4. Delete corresponding conversation history entries (those turns)
5. Reset `current_question_id` in sessions table to the target question's ID
6. Update `conversation_state.current_turn` to reflect the rollback
7. Return the question text and its previous answer (if any)

### Phase 2: Frontend Hook Enhancement

**Update `usePublicSurvey.js`:**

1. **Add answer history tracking:**
   - Track question sequence: `questionHistory = [{questionId, questionText, answerId, turnNumber}]`
   - Store this in state or ref

2. **Implement full `goBack()` function:**
   ```javascript
   const goBack = async (targetIndex) => {
     try {
       setSubmitting(true);
       
       // Call API to rollback to target question
       const data = await publicSurveyApi.goBackToQuestion(sessionId, targetIndex);
       
       // Update local state
       setAnswers(answers.slice(0, targetIndex));
       setCurrentQuestion(data.question);
       setCurrentAnswer(data.currentAnswer || '');
       
       // Remove questions from history beyond targetIndex
       setQuestionHistory(questionHistory.slice(0, targetIndex + 1));
     } catch (error) {
       showError('Failed to go back: ' + error.message);
     } finally {
       setSubmitting(false);
     }
   };
   ```

### Phase 3: UI Implementation

**Update `SurveyStep.jsx`:**

1. **Add back button:**
   ```jsx
   {answers.length > 0 && (
     <Button onClick={() => goBack(answers.length - 1)} variant="outline">
       ← Back
     </Button>
   )}
   ```

2. **Optional: Question history sidebar** showing all previous Q&As with ability to click and edit

3. **Update progress bar** to show clickable history

### Phase 4: Database Management

**Handle cascading deletes:**

1. **Answers table:** DELETE WHERE session_id = X AND created_at > (target answer's created_at)
2. **Conversation history:** DELETE WHERE session_id = X AND turn_number > (target turn)
3. **AI insights:** DELETE WHERE session_id = X AND turn_number > (target turn)
4. **Facts:** Optionally keep or remove facts extracted from deleted answers (recommend: remove)
5. **Conversation state:** UPDATE current_turn to target turn number

**SQL Implementation:**
```sql
-- Get target turn number
WITH target_info AS (
  SELECT turn_number 
  FROM conversation_history 
  WHERE session_id = $1 AND question_id = $2
  ORDER BY turn_number ASC 
  LIMIT 1 OFFSET $3
)
DELETE FROM answers 
WHERE session_id = $1 
AND question_id IN (
  SELECT question_id 
  FROM conversation_history 
  WHERE session_id = $1 
  AND turn_number > (SELECT turn_number FROM target_info)
);

DELETE FROM conversation_history 
WHERE session_id = $1 
AND turn_number > (SELECT turn_number FROM target_info);

UPDATE conversation_state 
SET current_turn = (SELECT turn_number FROM target_info)
WHERE session_id = $1;
```

### Phase 5: Answer Submission After Going Back

**When user resubmits an answer after going back:**

1. The existing `submitAnswer` API already handles this:
   - If answer exists, it updates it (via `upsertMultipleFactsWithOrg`)
   - If new answer, it creates it
2. AI regeneration automatically happens when we request next question
3. The system will generate new questions based on updated answer

### Phase 6: Edge Cases

1. **Going back to question 1:** 
   - Reset all tracking state
   - Clear conversation history except question 1
   - Start fresh

2. **Going back multiple times in sequence:**
   - Just keep deleting from the end each time
   - State should be consistent

3. **Going back while on final question:**
   - Set progress.completed = false
   - Allow continuing after answer change

4. **Database constraints:**
   - Ensure foreign key cascades work properly
   - May need to delete in correct order

## Files to Modify

### Backend:
1. `api/src/core/surveys/routes/public-survey-unified.routes.js` - Add go-back endpoint
2. `api/src/database/repositories/answer.repository.js` - Add bulk delete method
3. `api/src/core/surveys/services/conversationTrackingService.js` - Add rollback method

### Frontend:
1. `web/src/hooks/usePublicSurvey.js` - Implement full goBack
2. `web/src/utils/publicSurveyApi.js` - Add goBackToQuestion method
3. `web/src/pages/surveys/components/SurveyStep.jsx` - Add back button
4. `web/src/pages/surveys/components/SurveyAnswerHistory.jsx` - (Optional) Add history sidebar

## Testing Checklist

- [ ] Can go back from question 3 to question 2
- [ ] Answer is preserved when going back
- [ ] Can edit answer and re-submit
- [ ] Next question regenerates based on new answer
- [ ] Can go all the way back to question 1
- [ ] Subsequent answers after rollback are correct
- [ ] Database state is clean (no orphaned records)
- [ ] Conversation history is properly truncated
- [ ] AI insights are cleared appropriately
- [ ] Progress bar updates correctly
- [ ] Survey completion logic works after going back

## Success Metrics

- Users can navigate back to any previous question
- Answer changes are persisted to database
- AI regenerates subsequent questions based on changes
- No database inconsistencies (orphaned records)
- Smooth UX with loading states during rollback
