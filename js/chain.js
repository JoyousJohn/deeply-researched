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

const phasePrefixAdditions = {
    'createSections': `[`               
}

let questions;

let plan = [];
let planChanges = {}
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
        // max_tokens: 2048,
        // response_format: { type: "json_object" }
    };

    if (phase === 'waitingForInput') {

        setPhase('confirmingValidTopic')

        $('.name, .model-name').fadeOut();

        payload['messages'] = [
            {role: "system", content: isResearchTopic},
            {role: "user", content: "The user's query is: " + input},
            {role: "assistant", content: '{'}
        ]
        newActivity('Understanding the request', undefined, undefined, true)
        stats['start_time'] = new Date();
        startTimer()
        

    } else if (phase === 'refiningRequest') {
        payload['messages'] = [
            {role: "system", content: narrowQuestionPrompt},
            {role: "user", content: "The user's research query is: " + input},
            {role: "assistant", content: "{"}
        ]
        newActivity('Discerning the task', undefined, undefined, true);
    
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
        newActivity('Refining questions answered');
        newActivity("Refining the task", undefined, undefined, true);
    

    } else if (phase === 'createSections') {
        payload['messages'] = [
            {role: "system", content: createSections},
            {role: "user", content: `
                QUERY: ${refinedRequest}
                FORMATTING_REQUIREMENTS: ${refinedFormattingRequirements}
                CONTENT_REQUIREMENTS: ${refinedContentRequirements}`
            },
            {role: 'assistant', content:'['}
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

        newActivity('Confirming document adherence', undefined, undefined, true);

    } else if (phase === 'reviseContent') {
        payload['messages'] = [
            {role: "system", content: reviseContentPrompt},
            {role: "user", content: `
                DOCUMENT_OUTLINE: ${JSON.stringify(plan)}
                CONTENT_REQUIREMENTS: ${refinedContentRequirements}`
            },
            {role: "assistant", content: "{"}
        ]

        newActivity('Confirming content adherence', undefined, undefined, true);

    } else if (phase === 'reviseDocument') {
        payload['messages'] = [
            {role: "system", content: reviseDocumentPrompt},
            {role: "user", content: `
                DOCUMENT_OUTLINE: ${JSON.stringify(plan)}
                FORMAT_REQUIREMENTS: ${refinedFormattingRequirements},
                CONTENT_REQUIREMENTS: ${refinedContentRequirements}`
            },
            {role: "assistant", content: "{"}
        ]

        newActivity('Confirming document adherence', undefined, undefined, true);
    
    } else if (phase === 'done') {

        let researchStr = ''

        finalContent.forEach(section => {
            researchStr += section.section_title
            researchStr += section.section_content + '\n\n'
        })

        payload['messages'] = [
            {role: "assistant", content: "Here is the in-depth research you requested: " + researchStr},
            {role: "user", content: input}
        ]

        newActivity('Responding to request...', undefined, undefined, false);

    }

    makeRequest(payload);
}


function latestTimerId() {
    return parseInt(Object.keys(activityTimers)[0]);
}

let content;
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

        try {
            content = fullResponse.choices[0].message.content;
            console.log(content);

            if (phase === 'createSections') {
                content = JSON.parse(content);
                if (typeof content === 'object' && !Array.isArray(content)) {
                    console.log("(1) Attempting to fix createSections by wrapping obj in array")
                    content = [content];
                    console.log(content)
                }
            }

            else if (phase !== 'done') {
                content = JSON.parse(content);
            }
                     
        } catch (e) {

            try {
                // if (phase === 'createSections' || phase === 'refineTaskWithAnsweredQuestions' || phase === 'reviseFormatting' || phase === 'reviseContent' || phase === 'refiningQuestionsAsked') {
                //     content = content.replace(/\s+/g, ' ')
                // }
    
                content = content.trim().replace('```json', '').replaceAll('```', '').replaceAll('\n', '').replaceAll(']"', ']');

                content = content.replace(/^\s+/, '');

                console.log('content after trimming stufs: ', content)

                if (phase !== 'createSections') {

                    if (content.charAt(content.length - 1) !== '}') {
                        const lastClosingBraceIndex = content.lastIndexOf('}');
                        console.log(content)
                        console.log('last char wasn not closing brace, splitting at last closing closing brace...')
                        content = content.substring(0, lastClosingBraceIndex + 1);
                        console.log(content)
                    }
                    if (content.charAt(0) !== '{') {
                        content = '{' + content;
                        console.log('adding bracket, new json:')
                        console.log(content)
                    }
                } 
                
                else if (phase === 'createSections') {
                    // Check if content starts with the prefix, if not, prepend it
                    if (!content.startsWith(phasePrefixAdditions.createSections)) {
                        console.log('adding prefix to content')
                        content = phasePrefixAdditions.createSections + content;
                    }

                    if (typeof content === 'object' && !Array.isArray(content)) {
                        console.log("(2) Attempting to fix createSections by wrapping obj in array")
                        content = [content];
                        console.log(content)
                    }

                    console.log(content)
                }

                content = JSON.parse(content)
    
            } catch {

                console.error("Error parsing JSON response:", e);
                console.log("Full response JSON:", fullResponse);
                newActivity("Error in chaining.")
                throw e;
            }

        }
        const usage = fullResponse.usage
        // console.log("Content: ", content)
    
        if (phase === 'refiningRequest') {

            const preamble = content.preamble
            questions = content.questions

            let msgStr = preamble + '\n'
            questions.forEach((question, index) => {
                msgStr += `\n${index + 1}.  ` + question
            })
            newModelMessageElm()
            addToModalMessage(msgStr)

            addTokenUsageToActivity(usage, undefined, latestTimerId())
            setPhase('refiningQuestionsAsked')
            newActivity('Waiting for task clarification');
            enableBar();

        } else if (phase === 'confirmingValidTopic') {

            console.log(content)

            addTokenUsageToActivity(usage, undefined, latestTimerId())

            if (content.is_valid_request === true) {
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
                addToModalMessage("I apologize, but I cannot proceed with this request. " + content.explanation);
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

            refinedRequest = content.query;
            refinedFormattingRequirements = content.formatting_requirements;
            refinedContentRequirements = content.content_requirements

            newModelMessageElm(true);
            addToModalMessage('I refined the query: ' + refinedRequest)
            addToModalMessage('\n\nI will follow these formatting requirements: ' + refinedFormattingRequirements)
            addToModalMessage('\n\nI will include these content requirements: ' + refinedContentRequirements)

            addQueryToOutline(content)

            addTokenUsageToActivity(usage, undefined, latestTimerId())

            setPhase('createSections')
            nextPhase();


        } else if (phase === 'createSections') {

            plan = content;
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


            setPhase('reviseDocument')
            nextPhase();
            // nextPhase()

        } else if (phase === 'reviseFormatting') {

            addTokenUsageToActivity(usage, undefined, latestTimerId())

            const needed_changes = content.needed_changes

            console.log(content)

            if (!needed_changes) {
                setPhase('reviseContent')
                newActivity('Layout conforms with formatting')
                nextPhase();
            } else {
                newActivity('Modified layout to follow formatting')
                // newModelMessageElm(true)
                addToModalMessage('\n\nI made some formatting changes to the layout: ' + content.changes_explanation)
                priorPlans.push(plan)
                plan = content.modified_layout
                nextPhase(); // iterate again
            }

        } else if (phase === `reviseContent`) {

            addTokenUsageToActivity(usage, undefined, latestTimerId())

            const meets_requirements = content.meets_requirements

            console.log(content)

            if (meets_requirements) {
                newActivity('Layout content conforms with requirements')
                beginSearches();
            } else {
                newActivity('Modified layout to follow content requirements')
                addToModalMessage('\n\nI modified the layout to fulfill all content requirements: ' + content.changes_explanation)
                priorPlans.push(plan)
                plan = content.modified_outline
                addPlanToOutline(plan)
                nextPhase(); // iterate again
            }

        } else if (phase === `reviseDocument`) {

            addTokenUsageToActivity(usage, undefined, latestTimerId())

            const requirements_met = content.requirements_met

            console.log(content)

            if (requirements_met) {
                newActivity('Layout conforms with document requirements')
                beginSearches();
            } else {
                newActivity('Modified layout to follow document requirements')
                addToModalMessage('\n\nI modified the layout to fulfill formatting requirements: ' + content.explanation.format)
                addToModalMessage('\n\nI modified the layout to fulfill content requirements: ' + content.explanation.content)
                priorPlans.push(plan)
                plan = content.rewritten_layout
                planChanges = content.explanation
                addPlanToOutline(plan)
                nextPhase(); // iterate again
            }

        } else if (phase === 'done') {
            newModelMessageElm(false);
            addToModalMessage(content);
            newActivity('Responded.')
            enableBar();
        }
    })
    .catch(error => console.error('Error:', error));
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

    let workingcontent = '';
    let totalWords = 0;

    let memoryMapcontent = ''
    let memoryMapWordsLength = 0;

    if (Object.keys(sources).length !== 0) {
        workingcontent = 0;
        Object.values(sources).forEach(source => {
            workingcontent += source['length'];
            totalWords += source['text'].split(' ').length

            if (source['description']) {
                memoryMapcontent += source['description']
                memoryMapWordsLength += source['description'].split(' ').length
            }
        })
        workingcontent = workingcontent.toLocaleString()
        workingcontent = '<br>Source content: ' + workingcontent + ` chars / ${totalWords.toLocaleString()} words`

        memoryMapcontent =  `<br> Memory map: ` + memoryMapcontent.length.toLocaleString() + ` chars / ${memoryMapWordsLength.toLocaleString()} words`

    }

    $('.overall-tokens').html(`${overallTokens['input'].toLocaleString()} / ${overallTokens['output'].toLocaleString()} / ${(overallTokens['input'] + overallTokens['output']).toLocaleString()} total tokens <br>${cost} ${overallTokens['requests']} request${overallTokens['requests'] !== 1 ? 's' : ''} / <span class="rpm">${rpm}</span> RPM${workingcontent}${memoryMapcontent}`)

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

function updateModalContent(fullContent) {
    const $lastMsg = $('.message-wrapper').last();
    // Store the current scroll position
    const scrollPos = $('.message-container').scrollTop();
    
    // Replace the content while preserving any existing classes and attributes
    $lastMsg.html(fullContent);
    
    // Restore the scroll position
    $('.message-container').scrollTop(scrollPos);
    
    // Ensure all content is visible
    $lastMsg.find('span').css({
        'opacity': '1',
        'transition': 'opacity 0.2s ease-in'
    });
}

function startTimer() {
    if (timer) { 
        clearInterval(timer);
    }
    timer = setInterval(() => {
        elapsedTime++;
        updateRuntimeDisplay();
    }, 1000);

    setTimeout(() => {
        $('.progress-bar').fadeIn();   
    }, 1000);
}

function stopTimer() {
    clearInterval(timer);
    timer = null;
}

function updateRuntimeDisplay() {
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    $('.runtime').text(minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`);
}