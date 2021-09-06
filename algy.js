let newAlg = {
    oca: {
        outcomes: [
            {conditions: [ 
                {variable:'netHours',operator:'greater-than-or-equal-to',value:0}, 
                {variable:'lessonsBehind',operator:'less-than',value:20} 
            ], result: {state: 'Approve',suggestion: 'BLANK'}},
            {conditions: [ 
                {variable:'netHours',operator:'greater-than-or-equal-to',value:0}, 
                {variable:'lessonsBehind',operator:'greater-than-or-equal-to',value:20}, 
                {variable:'lessonsBehind',operator:'less-than',value:35} 
            ], result: {state: 'Review', suggestion: 'Consider adjustments'}},
            {conditions: [ {
                variable:'netHours',operator:'greater-than-or-equal-to',value:0}, 
                {variable:'lessonsBehind',operator:'greater-than-or-equal-to',value:35} 
            ], result: {state: 'Adjust', suggestion: 'Consider removing time.'}},
            {conditions:[
                {variable:'netHours',operator:'less-than',value:0}, 
                {variable:'lessonsBehind',operator:'greater-than-or-equal-to',value:20},
                {variable:'lessonTimeAlignment',operator:'within-plus-minus-range',value:10}
            ],result:{state: 'Review', suggestion: 'Missing time and lessons are aligned.'}},
            {conditions:[
                {variable:'netHours',operator:'less-than',value:0},
                {variable:'lessonsBehind',operator:'greater-than-or-equal-to',value:20},
                {variable:'lessonTimeAlignment',operator:'exceeds-plus-minus-range',value:10}
            ],result:{state: 'Adjust', suggestion: 'Align time with missing lessons.'}},
            {conditions:[
                {variable:'netHours',operator:'less-than',value:0}, 
                {variable:'lessonsBehind',operator:'less-than',value:20}
            ],result:{state: 'Adjust', suggestion: 'Consider adding time.'}}
        ]
    }
}

let students = [
    {name:'Behind But Aligned',netHours:-25,lessonsBehind:20,lessonTimeAlignment:-5},
    {name:'Behind And Misaligned',netHours:-50,lessonsBehind:30,lessonTimeAlignment:-40},
    {name:'Behind And Caught Up',netHours:-5,lessonsBehind:0,lessonTimeAlignment:-5},
    {name:'Ahead And Overdue',netHours:20,lessonsBehind:40,lessonTimeAlignment:60},
    {name:'Ahead And Aligned',netHours:15,lessonsBehind:25,lessonTimeAlignment:40},
    {name:'Ahead And Caught Up',netHours:15,lessonsBehind:0,lessonTimeAlignment:15},
]

devTest();

function devTest(){
    // loop students and run getStudentOutcome for each
    students.forEach(student => {
        console.log(`${student.name} has the outcome(s): ${getStudentOutcome('oca', student)}`);
    })
}

function getStudentOutcome(school, student) {
    // loop the school.outcomes
    let schoolOutcomes = newAlg[school].outcomes;
    // should only be ONE match
    let outcomeMatches = [];
    schoolOutcomes.forEach(outcome => {
        let match = checkOutcomeMatch(outcome, student);
        if(match) {
            outcomeMatches.push(outcome.result.suggestion);
        }
    })
    return JSON.stringify(outcomeMatches);
}

function checkOutcomeMatch(outcome, student){
    let outcomeMatch = false;
    let conditionResults = [];
    let conditions = outcome.conditions;
    // loop through all conditions within the outcome
    conditions.forEach(condition => {
        conditionResults.push(checkCondition(condition, student));
    })
    // check if all true; if one found false then it all fails
    conditionResults.indexOf(false) == -1 ? outcomeMatch = true : outcomeMatch = false;
    return outcomeMatch;
}

function checkCondition(condition, student){
    let result = false;
    // expect condition to be in the form
    // {variable:'netHours',operator:'less-than',value:0}
    // less-than
    if(condition.operator == 'less-than') {
        student[condition.variable] < condition.value ? result=true : result=false; 
    }
    // greater-than
    if(condition.operator == 'greater-than') {
        student[condition.variable] > condition.value ? result=true : result=false; 
    }
    // less-than-or-equal-to
    if(condition.operator == 'less-than-or-equal-to') {
        student[condition.variable] <= condition.value ? result=true : result=false; 
    }
    // greater-than-or-equal-to
    if(condition.operator == 'greater-than-or-equal-to') {
        student[condition.variable] >= condition.value ? result=true : result=false; 
    }
    // equal-to
    if(condition.operator == 'equal-to') {
        student[condition.variable] == condition.value ? result=true : result=false; 
    }
    // not-equal-to
    if(condition.operator == 'not-equal-to') {
        student[condition.variable] !== condition.value ? result=true : result=false; 
    }
    // within-plus-minus-range
    if(condition.operator == 'within-plus-minus-range') {
        Math.abs(student[condition.variable]) < condition.value ? result=true : result=false; 
    }// exceeds-plus-minus-range
    if(condition.operator == 'exceeds-plus-minus-range') {
        Math.abs(student[condition.variable]) >= condition.value ? result=true : result=false; 
    }
    return result;
}