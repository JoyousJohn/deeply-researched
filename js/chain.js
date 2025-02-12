$('.search-arrow').click(function() {
    if (searching) { return; }
    sendMessage();
})

let phase;
let researchRequest;
let refinedRequest;
let refinedFormattingRequirements;
let refinedContentRequirements;
let input;

let questions;

let plan = [];
let priorPlans = [];
let requirements = {};
let remainingRequirements = {};

let timer; 
let elapsedTime = 0; 

const activityTimers = {};

setPhase('waitingForInput')

function setPhase(newPhase) {
    phase = newPhase;
    $('.phase').text(phase);
}

function sendMessage() {
    input = $('textarea').val()
    if (!input) {
        return;
    }

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
        // response_format: { type: "json_object" }
    };

    if (phase === 'waitingForInput') {

        setPhase('confirmingValidTopic')

        $('.name, .model-name').fadeOut();

        payload['messages'] = [
            {role: "system", content: isResearchTopic},
            {role: "user", content: "The user's query is: " + input}
        ]
        newActivity('Understanding the request', undefined, undefined, true)
        stats['start_time'] = new Date();
        startTimer()
        

    } else if (phase === 'refiningRequest') {
        payload['messages'] = [
            {role: "system", content: narrowQuestionPrompt},
            {role: "user", content: "The user's research query is: " + input}
        ]
        newActivity('Recognizing any ambiguity', undefined, undefined, true);
    
    }  else if (phase === 'refiningQuestionsAsked') {

        payload['messages'] = [
            {role: "system", content: refactorPrompt},
            {role: "user", content: `
                USER_QUERY: ${researchRequest}
                QUESTIONS_ASKED: ${questions}
                USER_ANSWERS: ${input}
            `},
            {role: "assistant", content: "{"}
        ]

        setPhase('refineTaskWithAnsweredQuestions')
        newActivity('User answered refining questions');
        newActivity("Refining the task", undefined, undefined, true);
    

    } else if (phase === 'createSections') {
        payload['messages'] = [
            {role: "system", content: createSections},
            {role: "user", content: `
                QUERY: ${refinedRequest}
                FORMATTING_REQUIREMENTS: ${refinedFormattingRequirements}
                CONTENT_REQUIREMENTS: ${refinedContentRequirements}`
            }
        ]

        newActivity('Creating a search plan', undefined, undefined, true);
    
    } else if (phase === 'reviseFormatting') {
        payload['messages'] = [
            {role: "system", content: reviseFormattingPrompt},
            {role: "user", content: `
                DOCUMENT_LAYOUT: ${JSON.stringify(plan)}
                FORMAT_REQUIREMENTS: ${refinedFormattingRequirements}`
            },
            {role: "assistant", content: "{"}
        ]

        newActivity('Confirming formatting adherence', undefined, undefined, true);
    }

    makeRequest(payload);
}


function addTokenUsageToActivity(usage, url, timerId) {

    // alert(timerId)

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
    }

    overallTokens['requests']++

    if (url) {
        const $element = $(`.token-count[data-activity-url="${url}"]:not(.activity-error)`).first();
        $element.text(usage.prompt_tokens + ' / ' + usage.completion_tokens + ' / ' + usage.total_tokens + ' tokens' + totalTime + cost);
        $element.parent().find('.activity-header').removeClass('activity-understanding');
    } else {
        $('.token-count:not(.activity-error').first().text(usage.prompt_tokens + ' / ' + usage.completion_tokens + ' / ' + usage.total_tokens + ' tokens' + totalTime + cost);
    }

    if (timerId) {
        // console.log(`Stopping timer with id: ${timerId}`)
        stopActivityTimer(timerId);
    }

    if (cost) {
        cost = ' $' + overallTokens['cost'].toString().split(/(?<=\.\d*?[1-9]\d)/)[0] + ' / '
    }

    overallTokens['input'] += usage.prompt_tokens
    overallTokens['output'] += usage.completion_tokens

    const current_time = new Date();
    const timeDifference = current_time - stats['start_time'];
    let minutes = (timeDifference / (1000 * 60));
  
    let rpm = (overallTokens['requests']/minutes).toFixed(1)
    if (rpm > overallTokens['requests']) {
        rpm = overallTokens['requests']
    }

    let workingContext = '';
    let totalWords = 0;

    let memoryMapContext = ''
    let memoryMapWordsLength = 0;

    if (Object.keys(sources).length !== 0) {
        workingContext = 0;
        Object.values(sources).forEach(source => {
            workingContext += source['length'];
            totalWords += source['text'].split(' ').length

            if (source['description']) {
                memoryMapContext += source['description']
                memoryMapWordsLength += source['description'].split(' ').length
            }
        })
        workingContext = workingContext.toLocaleString()
        workingContext = '<br>Source context: ' + workingContext + ` chars / ${totalWords.toLocaleString()} words`

        memoryMapContext =  `<br> Memory map: ` + memoryMapContext.length.toLocaleString() + ` chars / ${memoryMapWordsLength.toLocaleString()} words`

    }

    $('.overall-tokens').html(`${overallTokens['input'].toLocaleString()} / ${overallTokens['output'].toLocaleString()} / ${(overallTokens['input'] + overallTokens['output']).toLocaleString()} total tokens <br>${cost} ${overallTokens['requests']} request${overallTokens['requests'] !== 1 ? 's' : ''} / <span class="rpm">${rpm}</span> RPM${workingContext}${memoryMapContext}`)

}


function latestTimerId() {
    return parseInt(Object.keys(activityTimers)[0]);
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
    .then(response => {
        if (!response.ok) {
            newActivity(`Received HTTP error ${response.status}`)
            response.json().then(errorMessage => {
                newActivity(`Error message: ${Object.values(errorMessage).map(value => JSON.stringify(value)).join(', ')}`);
                clearTimeout(timer)
            });
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(fullResponse => {
        // console.log('Full response received:', fullResponse);

        let context;
        try {
            console.log(fullResponse.choices[0].message.content)

            if (phase === 'createSections' || phase === 'refineTaskWithAnsweredQuestions') {
                fullResponse.choices[0].message.content = fullResponse.choices[0].message.content.replace(/\s+/g, ' ')
            }

            let content = fullResponse.choices[0].message.content.trim();
            if (content.charAt(content.length - 1) !== '}') {
                const lastClosingBraceIndex = content.lastIndexOf('}');
                console.log(content)
                content = content.substring(0, lastClosingBraceIndex + 1);
                console.log(content)
            }
            if (content.charAt(0) !== '{') {
                context = '{' + content;
                console.log('adding bracket, new json:')
                console.log(context)
                context = JSON.parse(context);
            } else {
                context = JSON.parse(content.replace('```json', '').replace('```', ''));
            }
            
        } catch (e) {
            console.error("Error parsing JSON response:", e);
            console.log("Full response JSON:", fullResponse);
            newActivity("Error in chaining.")
            throw e;
        }
        const usage = fullResponse.usage
        // console.log("Content: ", context)
    
        if (phase === 'refiningRequest') {

            const preamble = context.preamble
            questions = context.questions

            let msgStr = preamble + '\n'
            questions.forEach(question => {
                msgStr += '\n•  ' + question
            })
            newModelMessageElm()
            addToModalMessage(msgStr)

            addTokenUsageToActivity(usage, undefined, latestTimerId())
            setPhase('refiningQuestionsAsked')
            newActivity('Waiting for task clarification');
            enableBar();

        } else if (phase === 'confirmingValidTopic') {

            addTokenUsageToActivity(usage, undefined, latestTimerId())

            if (context.is_valid_request === true) {
                // alert(Object.keys(activityTimers)[0])
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

            // start the interval here
            setInterval(() => {
                let minutes = (elapsedTime / 60);
                let rpm = (overallTokens['requests'] / minutes).toFixed(1);
                if (rpm > overallTokens['requests']) {
                    rpm = overallTokens['requests'];
                }
                $('.rpm').text(rpm)
            }, 3000);

        } else if (phase === 'refineTaskWithAnsweredQuestions') {

            refinedRequest = context.query;
            refinedFormattingRequirements = context.formatting_requirements;
            refinedContentRequirements = context.content_requirements

            newModelMessageElm(true);
            addToModalMessage('I refined the query: ' + refinedRequest)
            addToModalMessage('\n\nI will follow these formatting requirements: ' + refinedFormattingRequirements)
            addToModalMessage('\n\nI will include these content requirements: ' + refinedContentRequirements)

            addQueryToOutline(context)

            addTokenUsageToActivity(usage, undefined, latestTimerId())

            setPhase('createSections')
            nextPhase();


        } else if (phase === 'createSections') {

            plan = context.sections;
            const sectionTitles = plan.map(section => section.section_title);
            // console.log(sectionTitles)
            // const sectionTitlesList = sectionTitles.join(', ').replace(/, ([^,]*)$/, ', and $1');
            
            addToModalMessage(`\n\nI have formulated a layout for your report, which will contain the following ${plan.length} sections:.`);

            addToModalMessage('<ul>')
            sectionTitles.forEach(sectionTitle => {
                addToModalMessage(`<li>${sectionTitle}</li>`)
            })
            addToModalMessage('<ul>')

            addToModalMessage(`\n\nI will begin by gathering sources and content required for the ${sectionTitles[0]} section by following this guide: ${plan[0].description}`)
            
            $('.current-section').text(`Working on section 1/${sectionTitles.length}`)

            addTokenUsageToActivity(usage, undefined, latestTimerId())
            newActivity('Planned an outline');
            addPlanToOutline()

            // beginSearches();


            setPhase('reviseFormatting')
            nextPhase();
            // nextPhase()

        } else if (phase === 'reviseFormatting') {

            addTokenUsageToActivity(usage, undefined, latestTimerId())

            const follows_formatting = context.follows_formatting

            console.log(context)

            if (follows_formatting) {
                newActivity('Layout conforms with formatting')
                beginSearches();
            } else {
                newActivity('Modified layout to follow formatting')
                priorPlans.push(plan)
                plan = context.modified_layout
                nextPhase(); // iterate again
            }


        } else {
            // Fallback: simply add the full response to the modal
            addToModalMessage(fullResponse);
        }
    })
    .catch(error => console.error('Error:', error));
  }
  

function newTimerId() {
    return $('.activity-header').length + 1;
}  

function newActivity(activity, url, is_error, add_timer) {
    if (!url) {
        url = '';
    }
    $('.activity-working').removeClass('activity-working')
    const $newActivityElm = $(`
    <div class="flex flex-col">
        <div class="activity-header activity-working">${activity}</div>
        <div class="token-count" data-activity-url="${url}"></div>
        <div class="activity-sites flex flex-col"></div>
    </div>`)
    if (url) {
        $newActivityElm.find('div').first().addClass('activity-understanding')
    }
    if (is_error) {
        $newActivityElm.find('.token-count').first().addClass('activity-error')
    }
    $('.activity').prepend($newActivityElm)

    if (add_timer) {

        const timerId = newTimerId();
        let secondsElapsed = 0;
        const $tokenCount = $newActivityElm.find('.token-count');
    
        $tokenCount.text(`Elapsed time: 0.0s`).attr('data-timer-id', timerId);
        activityTimers[timerId] = setInterval(() => {
            secondsElapsed += 0.1; // Increment by 0.1 seconds
            $tokenCount.text(`${secondsElapsed.toFixed(1)}s`); // Show one decimal place
        }, 100); // Update every 100 milliseconds
    }
   
}

function stopActivityTimer(timerId) {
    const timer = activityTimers[timerId];
    if (timer) {
        window.clearInterval(timer);
        delete activityTimers[timerId];
    }
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

function startTimer() {
    console.log("Starting timer..."); // Debug log
    if (timer) { // Check if timer is already set
        console.log("Clearing existing timer:", timer); // Debug log
        clearInterval(timer); // Clear the existing timer
    }
    timer = setInterval(() => {
        elapsedTime++;
        updateRuntimeDisplay();
    }, 1000);

    setTimeout(() => {
        $('.progress-bar').fadeIn();   
    }, 1000);
    console.log("Timer started with ID:", timer); // Debug log
}

function stopTimer() {
    console.log("Stopping timer..."); // Debug log
    console.log("Timer before clear:", timer); // Debug log
    clearInterval(timer);
    timer = null; // Reset timer to null after clearing
    console.log("Timer after clear:", timer); // Debug log
}

function updateRuntimeDisplay() {
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    $('.runtime').text(minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`);
}