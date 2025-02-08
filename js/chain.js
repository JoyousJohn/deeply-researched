$('.search-arrow').click(function() {
    sendMessage();
})

let phase;
let researchRequest;
let refinedRequest;
let input;

let questions;

let plan;
let requirements = {};
let remainingRequirements = {};

setPhase('waitingForInput')

function setPhase(newPhase) {
    phase = newPhase;
    $('.phase').text(phase);
}

function sendMessage() {
    input = $('textarea').val()
    disableBar();
    newModalUserMessage(input)
    nextPhase()
}

function nextPhase() {
    let payload = {
        model: decoderModelId,
        // repetition_penalty: 1.1,
        temperature: 0.7,
        top_p: 0.9,
        // top_k: 40,
        max_tokens: 2048,
        response_format: { type: "json_object" }
    };

    if (phase === 'waitingForInput') {

        setPhase('confirmingValidTopic')

        $('.name, .model-name').fadeOut();

        payload['messages'] = [
            {role: "system", content: isResearchTopic},
            {role: "user", content: "The user's query is: " + input}
        ]
        newActivity('Understanding the request')

    } else if (phase === 'refiningRequest') {
        payload['messages'] = [
            {role: "system", content: narrowQuestionPrompt},
            {role: "user", content: "The user's research query is: " + input}
        ]
        newActivity('Generating questions to narrow the task');
    
    }  else if (phase === 'refiningQuestionsAsked') {

        payload['messages'] = [
            {role: "system", content: refactorPrompt},
            {role: "user", content: `
                USER_QUERY: ${researchRequest}
                QUESTIONS_ASKED: ${questions}
                USER_ANSWERS: ${input}
            `}
        ]

        setPhase('refineTaskWithAnsweredQuestions')
        newActivity('User answered refining questions');
        newActivity("Refining the task");
    

    } else if (phase === 'createSections') {
        payload['messages'] = [
            {role: "system", content: createSections},
            {role: "user", content: `Research query: ${refinedRequest}`}
        ]

        newActivity('Creating a search plan');
    
    } else if (phase === 'createRequirements') {

        let docDescStr;

        plan.forEach(section => {
            docDescStr += `${section.section_title}: ${section.description}`
        })

        // console.log(docDescStr)

        payload['messages'] = [
            {role: "system", content: requiredInfoPrompt},
            {role: "user", content: `: Paper overview and descriptions for each section: ${docDescStr}`}
        ]

        newActivity('Gathering required materials');

    }

    makeRequest(payload);
}


function addTokenUsageToActivity(usage) {

    let totalTime = '';
    if (usage.total_time) {
        totalTime = usage.total_time
    } else if (usage.total_latency) {
        totalTime = usage.total_latency
    }
    if (totalTime) {
        totalTime = ' | ' + totalTime.toFixed(2) + 's'
    }

    let cost = '';
    if (usage.estimated_cost) {
        cost = usage.estimated_cost.toString().split(/(?<=\.\d*?[1-9])/)[0];
        cost = ' | $' + cost
        overallTokens['cost'] += usage.estimated_cost
        overallTokens['requests']++
    }

    $('.token-count').first().text(usage.prompt_tokens + ' / ' + usage.completion_tokens + ' / ' + usage.total_tokens + ' tokens' + totalTime + cost)

    overallTokens['input'] += usage.prompt_tokens
    overallTokens['output'] += usage.completion_tokens

    let workingContext = '';
    let totalWords = 0;
    if (Object.keys(sources).length !== 0) {
        workingContext = 0;
        Object.values(sources).forEach(source => {
            workingContext += source['length'];
            totalWords += source['text'].split(' ').length
        })
        workingContext = workingContext.toLocaleString()
        workingContext = '<br>Working context: ' + workingContext + `chars / ${totalWords.toLocaleString()} words`
    }

    $('.overall-tokens').html(`${overallTokens['input'].toLocaleString()} / ${overallTokens['output'].toLocaleString()} / ${(overallTokens['input'] + overallTokens['output']).toLocaleString()} total tokens <br> $${overallTokens['cost'].toString().split(/(?<=\.\d*?[1-9]\d)/)[0]} / ${overallTokens['requests']} requests ${workingContext}`)

}


function makeRequest(payload) {
    fetch(decoderBase, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${decoderKey}`
      },
      body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(fullResponse => {
        // console.log('Full response received:', fullResponse);

        let context;
        try {
            context = JSON.parse(fullResponse.choices[0].message.content);
        } catch (e) {
            console.error("Error parsing JSON response:", e);
            console.log("Full response JSON:", fullResponse);
            throw e;
        }
        const usage = fullResponse.usage
        console.log("Content: ", context)
    
        if (phase === 'refiningRequest') {

            const preamble = context.preamble
            questions = context.questions

            let msgStr = preamble + '\n'
            questions.forEach(question => {
                msgStr += '\n•  ' + question
            })
            newModelMessageElm()
            addToModalMessage(msgStr)

            addTokenUsageToActivity(usage)
            setPhase('refiningQuestionsAsked')
            newActivity('Asking user to refine their request');
            enableBar();

        } else if (phase === 'confirmingValidTopic') {

            if (context.is_valid_request === true) {
                addTokenUsageToActivity(usage)
                newActivity('Request confirmed');
                setPhase('refiningRequest');
                nextPhase();
                researchRequest = input;
            } else {
                newModelMessageElm();
                addTokenUsageToActivity(usage)
                newActivity('Prompt was not researchable');
                newActivity('Awaiting new instructions');
                setPhase('waitingForInput');
                addToModalMessage("I apologize, but I cannot proceed with this request. " + context.explanation);
                enableBar();
            }

        } else if (phase === 'refineTaskWithAnsweredQuestions') {

            refinedRequest = context.description;
            newModelMessageElm(true);
            addToModalMessage('I have generated a research query: ' + refinedRequest)
            addTokenUsageToActivity(usage)

            setPhase('createSections')
            nextPhase();


        } else if (phase === 'createSections') {
            // For planningSearches, assume the fullResponse is a JSON array
            plan = context.sections;
            const sectionTitles = plan.map(section => section.section_title);
            console.log(sectionTitles)
            const sectionTitlesList = sectionTitles.join(', ').replace(/, ([^,]*)$/, ', and $1');
            
            addToModalMessage(
                `\n\nI have formulated a layout for your report, which will contain the following ${plan.length} sections: ${sectionTitlesList}. \n\n` +
                `I will begin by gathering sources and content required for the ${sectionTitles[0]} section by following this guide: ${plan[0].description}`
            );
            
            newActivity('Planned the sections');
            addTokenUsageToActivity(usage)
            setPhase('createRequirements')
            nextPhase()

        } else if (phase === 'createRequirements') {

            context.topics.forEach((topic, index) => {
                requirements[index] = topic
                remainingRequirements[index] = topic
            })

            addTokenUsageToActivity(usage)
            beginSearches();


        } else {
            // Fallback: simply add the full response to the modal
            addToModalMessage(fullResponse);
        }
    })
    .catch(error => console.error('Error:', error));
  }
  


function newActivity(activity) {
    $('.activity-working').removeClass('activity-working')
    const $newActivityElm = $(`
    <div class="flex flex-col">
        <div class="activity-header activity-working">${activity}</div>
        <div class="token-count"></div>
        <div class="activity-sites flex flex-col"></div>
    </div>`)
    $('.activity').prepend($newActivityElm)
}

function newModelMessageElm(debug) {
    const $msgElm = $(`<div class="message-wrapper"></div>`)
    if (debug) {
        $msgElm.css('color', 'gray')
    }
    $('.chat-space').append($msgElm)
}

function newModalUserMessage(message) {
    const $msgElm = $(`<div class="user-message-wrapper">${message}</div>`)
    $('.chat-space').append($msgElm)
}

function addToModalMessage(message) {
    const $lastMsg = $('.message-wrapper').last();
    const newSpan = $(`<span style="opacity: 0">${message}</span>`);
    $lastMsg.append(newSpan);
    // Trigger reflow to ensure transition works
    newSpan[0].offsetHeight;
    newSpan.css({
        'opacity': '1',
        'transition': 'opacity 0.2s ease-in'
    });
}