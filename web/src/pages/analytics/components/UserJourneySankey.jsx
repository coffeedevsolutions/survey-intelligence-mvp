import React from 'react';
import Plot from 'react-plotly.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';

const UserJourneySankey = ({ data }) => {
  // Prepare data for Plotly Sankey (like dashboard WorkflowFunnel)
  const prepareSankeyData = () => {
    if (!data?.userJourneyFlow?.questionFlow || data.userJourneyFlow.questionFlow.length === 0) {
      return {
        nodes: [],
        links: [],
        layout: {}
      };
    }

    const questionFlow = data.userJourneyFlow.questionFlow;
    const totalSessions = data.userJourneyFlow.totalSessions || 0;

    // Group questions by turn number and aggregate data
    const questionsByTurn = {};
    questionFlow.forEach(question => {
      if (!questionsByTurn[question.turnNumber]) {
        questionsByTurn[question.turnNumber] = {
          turnNumber: question.turnNumber,
          totalReached: 0,
          totalAnswered: 0,
          totalUnanswered: 0,
          completedAtThisQuestion: 0
        };
      }
      questionsByTurn[question.turnNumber].totalReached += question.questionCount;
      questionsByTurn[question.turnNumber].totalAnswered += question.answeredCount;
      questionsByTurn[question.turnNumber].totalUnanswered += question.unansweredCount;
      questionsByTurn[question.turnNumber].completedAtThisQuestion += question.completedAtThisQuestion || 0;
    });

    // Convert to array and sort by turn number
    const aggregatedQuestions = Object.values(questionsByTurn).sort((a, b) => a.turnNumber - b.turnNumber);

    // Create nodes - simple like dashboard
    const nodes = [
      { label: 'Surveys Started', color: '#3b82f6' }
    ];

    // Add question nodes - just Q1, Q2, Q3, etc.
    aggregatedQuestions.forEach((question) => {
      const dropOffRate = question.totalReached > 0 
        ? (question.totalUnanswered / question.totalReached) * 100 
        : 0;
      
      nodes.push({
        label: `Q${question.turnNumber}`,
        color: dropOffRate > 50 ? '#fbbf24' : dropOffRate > 25 ? '#f59e0b' : '#6b7280'
      });
    });

    // Add abandoned nodes for each question that has drop-offs
    const abandonedNodes = [];
    aggregatedQuestions.forEach((question, index) => {
      if (question.totalUnanswered > 0) {
        abandonedNodes.push({
          label: 'Abandoned',
          color: '#ef4444',
          questionIndex: index
        });
      }
    });
    
    // Insert completed and abandoned nodes right after their corresponding questions
    const allNodes = [
      { label: 'Surveys Started', color: '#3b82f6' }
    ];
    
    aggregatedQuestions.forEach((question, index) => {
      const dropOffRate = question.totalReached > 0 
        ? (question.totalUnanswered / question.totalReached) * 100 
        : 0;
      
      // Add the question node
      allNodes.push({
        label: `Q${question.turnNumber}`,
        color: dropOffRate > 50 ? '#fbbf24' : dropOffRate > 25 ? '#f59e0b' : '#6b7280'
      });
      
      // Add completed node if any sessions completed at this specific question
      if (question.completedAtThisQuestion > 0) {
        // Sessions completed the survey at this question
        allNodes.push({
          label: 'Completed',
          color: '#10b981',
          questionIndex: index,
          isFinalCompleted: index === aggregatedQuestions.length - 1
        });
      }
      
      // Add abandoned node right after this question if there are drop-offs
      if (question.totalUnanswered > 0) {
        allNodes.push({
          label: 'Abandoned',
          color: '#ef4444',
          questionIndex: index
        });
      }
    });
    
    // Update the nodes array
    nodes.splice(0, nodes.length, ...allNodes);

    // Create links array like dashboard
    const allLinks = [];
    
    // Start flow: All sessions begin
    if (totalSessions > 0 && aggregatedQuestions.length > 0) {
      const firstQuestion = aggregatedQuestions[0];
      allLinks.push({
        source: 0, // Started
        target: 1, // First question (index 1)
        value: firstQuestion.totalReached
      });
    }

    // Progressive question flow
    let currentNodeIndex = 1; // Start after Started node
    
    aggregatedQuestions.forEach((question, index) => {
      const questionNodeIndex = currentNodeIndex;
      currentNodeIndex++; // Move to next position
      
      // If sessions completed at this question, link to completed node
      if (question.completedAtThisQuestion > 0) {
        const completedNodeIndex = currentNodeIndex;
        currentNodeIndex++; // Move to next position after completed node
        
        if (index === aggregatedQuestions.length - 1) {
          // Final completed node - link as continuation of main flow
          allLinks.push({
            source: questionNodeIndex,
            target: completedNodeIndex,
            value: question.completedAtThisQuestion
          });
        } else {
          // Non-final completed node - link as branching arm
          allLinks.push({
            source: questionNodeIndex,
            target: completedNodeIndex,
            value: question.completedAtThisQuestion
          });
        }
      }
      
      // If there are drop-offs at this question, link to its abandoned node
      if (question.totalUnanswered > 0) {
        const abandonedNodeIndex = currentNodeIndex;
        currentNodeIndex++; // Move to next position after abandoned node
        
        allLinks.push({
          source: questionNodeIndex,
          target: abandonedNodeIndex,
          value: question.totalUnanswered
        });
      }
      
      // Link to next question (if exists) - only if there are users who continued
      if (index < aggregatedQuestions.length - 1) {
        const nextQuestion = aggregatedQuestions[index + 1];
        if (nextQuestion.totalReached > 0) {
          allLinks.push({
            source: questionNodeIndex,
            target: currentNodeIndex, // Next question node
            value: nextQuestion.totalReached
          });
        }
      } else if (index === aggregatedQuestions.length - 1 && question.completedAtThisQuestion > 0) {
        // If this is the last question and has a completed node, don't create additional links
        // The completed node will be the final destination
      }
    });

    // Filter out links with zero values
    const links = allLinks.filter(link => link.value > 0);

    // Align all question nodes in a straight horizontal line
    const questionY = 0.5; // All questions at the same vertical level
    const questionPositions = aggregatedQuestions.map((_, i) => ({
      x: 0.1 + (i * 0.12),
      y: questionY // All questions aligned horizontally
    }));

    // Position completed and abandoned nodes directly beneath their corresponding questions
    const allNodePositions = {
      x: [0], // Started
      y: [0.5] // Started
    };

    aggregatedQuestions.forEach((question, index) => {
      // Add question position (all aligned horizontally)
      allNodePositions.x.push(questionPositions[index].x);
      allNodePositions.y.push(questionY); // All questions at same level
      
      // Add completed position if sessions completed at this question
      if (question.completedAtThisQuestion > 0) {
        

        if (index === aggregatedQuestions.length - 1) {
          // Final completed node - position it as a regular question node to the right
          const finalX = questionPositions[index].x + 0.12; // To the right of the last question
          allNodePositions.x.push(finalX);
          allNodePositions.y.push(questionY); // Same level as questions
        } else {
          const nextQuestionIndex = index + 1;
          if (nextQuestionIndex < aggregatedQuestions.length) {
            // Position under the next question
            allNodePositions.x.push(questionPositions[nextQuestionIndex].x);
            allNodePositions.y.push(questionY - 0.45); // Below the next question
          } else {
            // If this is the last question, position under it
            allNodePositions.x.push(questionPositions[index].x);
            allNodePositions.y.push(questionY + 0.45);
          }
        }
      }
      
      // Add abandoned position beneath the NEXT question if there are drop-offs
      if (question.totalUnanswered > 0) {
        // Position abandoned node under the next question (where they gave up)
        const nextQuestionIndex = index + 1;
        if (nextQuestionIndex < aggregatedQuestions.length) {
          // Position under the next question
          allNodePositions.x.push(questionPositions[nextQuestionIndex].x);
          allNodePositions.y.push(questionY + 0.45); // Below the next question
        } else {
          // If this is the last question, position under it
          allNodePositions.x.push(questionPositions[index].x);
          allNodePositions.y.push(questionY + 0.45);
        }
      }
    });

    const nodePositions = {
      x: allNodePositions.x,
      y: allNodePositions.y
    };

    return {
      nodes,
      links,
      nodePositions
    };
  };

  const { nodes, links, nodePositions } = prepareSankeyData();

  if (nodes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Journey Flow</CardTitle>
          <CardDescription>Track question progression and drop-off points</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No conversation data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const plotData = [{
    type: 'sankey',
    orientation: 'h',
    node: {
      pad: 15,
      thickness: 20,
      line: {
        color: 'transparent',
        width: 0
      },
      label: nodes.map(n => n.label),
      color: nodes.map(n => n.color),
      x: nodePositions.x,
      y: nodePositions.y,
      labelposition: nodes.map((_, i) => i === 0 ? 'right' : 'left') // Started on right, others on left
    },
    link: {
      source: links.map(l => l.source),
      target: links.map(l => l.target),
      value: links.map(l => l.value),
      color: links.map(() => 'rgba(0,0,0,0.08)')
    }
  }];

  const layout = {
    font: { size: 11 },
    margin: { t: 30, b: 30, l: 15, r: 15 },
    height: 350,
    autosize: true,
    xaxis: { range: [0, 1.1] },
    yaxis: { range: [0.1, 0.9] },
    plot_bgcolor: 'rgba(0,0,0,0)',
    paper_bgcolor: 'rgba(0,0,0,0)'
  };

  const config = {
    displayModeBar: false,
    responsive: true
  };

  // Calculate summary stats using the same aggregated data
  const questionFlow = data.userJourneyFlow.questionFlow || [];
  
  // Group questions by turn number and aggregate (same as in prepareSankeyData)
  const questionsByTurn = {};
  questionFlow.forEach(question => {
    if (!questionsByTurn[question.turnNumber]) {
      questionsByTurn[question.turnNumber] = {
        turnNumber: question.turnNumber,
        totalReached: 0,
        totalAnswered: 0,
        totalUnanswered: 0,
        dropOffRate: 0
      };
    }
    questionsByTurn[question.turnNumber].totalReached += question.questionCount;
    questionsByTurn[question.turnNumber].totalAnswered += question.answeredCount;
    questionsByTurn[question.turnNumber].totalUnanswered += question.unansweredCount;
  });
  
  // Calculate drop-off rates for aggregated questions
  Object.values(questionsByTurn).forEach(question => {
    question.dropOffRate = question.totalReached > 0 
      ? (question.totalUnanswered / question.totalReached) * 100 
      : 0;
  });
  
  const aggregatedQuestions = Object.values(questionsByTurn).sort((a, b) => a.turnNumber - b.turnNumber);
  const totalUniqueQuestions = aggregatedQuestions.length;
  
  const avgDropOffRate = aggregatedQuestions.length > 0 
    ? aggregatedQuestions.reduce((sum, q) => sum + q.dropOffRate, 0) / aggregatedQuestions.length
    : 0;
    
  const highestDropOffQuestion = aggregatedQuestions.length > 0
    ? aggregatedQuestions.reduce((max, q) => q.dropOffRate > max.dropOffRate ? q : max, aggregatedQuestions[0])
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Journey Flow</CardTitle>
        <CardDescription>Track question progression and drop-off points</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Header Stats */}
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{data.userJourneyFlow.totalSessions || 0}</div>
              <div className="text-muted-foreground">Total Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{data.userJourneyFlow.completedSessions || 0}</div>
              <div className="text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{data.userJourneyFlow.incompleteSessions || 0}</div>
              <div className="text-muted-foreground">Abandoned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {data.userJourneyFlow.totalSessions > 0 
                  ? Math.round((data.userJourneyFlow.completedSessions / data.userJourneyFlow.totalSessions) * 100) 
                  : 0}%
              </div>
              <div className="text-muted-foreground">Completion Rate</div>
            </div>
          </div>
          
          {/* Sankey Diagram */}
          <div className="w-full">
            <Plot
              data={plotData}
              layout={layout}
              config={config}
              style={{ width: '100%', height: '350px' }}
            />
          </div>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <div className="text-sm font-medium">Total Questions</div>
              <div className="text-2xl font-bold">{totalUniqueQuestions}</div>
            </div>
            <div>
              <div className="text-sm font-medium">Avg Drop-off Rate</div>
              <div className="text-2xl font-bold">{avgDropOffRate.toFixed(1)}%</div>
            </div>
          </div>
          
          {/* Highest Drop-off Question */}
          {highestDropOffQuestion && (
            <div className="pt-4 border-t border-gray-200">
              <div className="text-sm font-medium text-red-600">Highest Drop-off Question</div>
              <div className="text-sm text-muted-foreground mt-1">
                Q{highestDropOffQuestion.turnNumber}: {highestDropOffQuestion.questionText}
              </div>
              <div className="text-sm font-bold text-red-600">
                {highestDropOffQuestion.dropOffRate}% drop-off rate
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserJourneySankey;