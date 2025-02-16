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

let completeSubsections = 0;

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
    let payloads = [];
    let payload = {
        model: decoderModelId,
        temperature: 0.7,
        top_p: 0.9,
    };

    if (phase === 'waitingForInput') {
        setPhase('confirmingValidTopic');
        $('.name, .model-name').fadeOut();
        payload['messages'] = [
            { role: "system", content: isResearchTopic },
            { role: "user", content: "The user's query is: " + input },
            { role: "assistant", content: '{' }
        ];
        payloads = [payload];
        newActivity('Understanding the request', undefined, undefined, true);
        stats['start_time'] = new Date();
        startTimer();

    } else if (phase === 'refiningRequest') {
        payload['messages'] = [
            { role: "system", content: narrowQuestionPrompt },
            { role: "user", content: "The user's research query is: " + input },
            { role: "assistant", content: "{" }
        ];
        payloads = [payload];
        newActivity('Discerning the task', undefined, undefined, true);

    } else if (phase === 'refiningQuestionsAsked') {
        const inputs = {
            USER_QUERY: researchRequest,
            QUESTIONS_ASKED: questions,
            USER_ANSWERS: input
        };

        payload['messages'] = [
            { role: "system", content: refactorPrompt },
            {
                role: "user",
                content: JSON.stringify(inputs)
            },
            { role: "assistant", content: "{" }
        ];
        payloads = [payload];

        setPhase('refineTaskWithAnsweredQuestions');
        newActivity('Refining questions answered');
        newActivity("Refining the task", undefined, undefined, true);

    } else if (phase === 'createSections') {
        const inputs = {
            query: refinedRequest,
            formatting_requirements: refinedFormattingRequirements,
            content_requirements: refinedContentRequirements
        };

        payload['messages'] = [
            { role: "system", content: createSections },
            {
                role: "user",
                content: JSON.stringify(inputs)
            },
            { role: 'assistant', content: '[' }
        ];
        payloads = [payload];

        newActivity('Creating a search plan', undefined, undefined, true);

    } else if (phase === 'generateSubsections') {
        plan.forEach(section => { // Iterate over the plan
            newActivity('Generating subsection', section.section_title, undefined, true);
            section.timer_id = latestTimerId();
            reviseDocumentForSection(section); // Call for each section
        });

        return;

    } else if (phase === 'done') {

        let researchStr = '';

        finalContent.forEach(section => {
            researchStr += section.section_title;
            researchStr += section.section_content + '\n\n';
        });

        payload['messages'] = [
            { role: "assistant", content: "Here is the in-depth research you requested: " + researchStr },
            { role: "user", content: input }
        ];

        newActivity('Responding to request...', undefined, undefined, false);

    }

    makeRequest(payloads, handleApiResponse); // <--- THIS IS THE KEY CHANGE
}


function reviseDocumentForSection(section) {
    const subsectionsInput = {
        SECTION_TITLE: section.section_title,
        SECTION_DESCRIPTION: section.description, // If you have a description property
        FORMATTING_REQUIREMENTS: refinedFormattingRequirements,
        CONTENT_REQUIREMENTS: refinedContentRequirements
    };

    const subsectionsPayload = {
        model: decoderModelId,
        temperature: 0.7,
        top_p: 0.9,
        messages: [
            { role: "system", content: generateSubsectionsPrompt },
            { role: "user", content: JSON.stringify(subsectionsInput) },
            { role: "assistant", content: "[" } // Or "{" if your LLM returns an object
        ]
    };

    makeRequest([subsectionsPayload], (responses, error) => {
        handleApiResponse(responses, error, section);
        completeSubsections++; // Decrement the counter when a request completes

        // Check if there are no active requests after this one completes
        if (completeSubsections === plan.length) {
            setPhase('Drafting')
            beginSearches(); // Call beginSearches if no active requests
        }
    });
    
}


let content;

function tryParseJson(content) {

    try {
        console.log(phase)
        console.log(phase === 'generateSubsections')
        content = JSON.parse(content);

        if (phase === 'createSections' || phase === 'generateSubsections') {

            console.log('pphase is cereateSections or generateSubsections 1')
            console.log(content)     

            console.log('1')
            try {

                
                if (typeof content === 'object' && !Array.isArray(content)) {
                    console.log('2')

                    console.log("(2) Attempting to fix createSections by wrapping obj in array");
                    return [content];
                } else if (typeof content === 'string' && !content.startsWith('[')) {
                    console.log('3')

                    content = '[' + content;
                    console.log(' adding opening squar ebracket')
                } else {
                    console.log('</3')
                }
            } catch (e) {
                console.log('0')
                console.log(e)
            }
            console.log('4')

        }
        console.log('5')


        console.log('returning content:')
        console.log(content)
        return content

    } catch (e) {
        // console.error("Initial JSON parse failed:", e);
        console.log("Attempting JSON healing...");

        content = content.trim().replace('```json', '').replaceAll('```', '').replaceAll('\n', '').replaceAll(']"', ']');
        content = content.replace(/^\s+/, '');

        if (phase === 'createSections' || phase === 'generateSubsections') {
            console.log('phase is createSections or generateSubsections2')
            if (!content.startsWith(phasePrefixAdditions.createSections)) {
                content = phasePrefixAdditions.createSections + content;
            }

            try { // Nested try-catch for createSections specific array wrapping
                let parsedContent = JSON.parse(content);
                if (typeof parsedContent === 'object' && !Array.isArray(parsedContent)) {
                    console.log("(2) Attempting to fix createSections by wrapping obj in array");
                    parsedContent = [parsedContent];
                }
                return parsedContent; // Return the potentially fixed content
            } catch (e2) {
                console.error("createSections array wrapping fix failed:", e2);
                console.log("Content at error:", content);
            }

        // } else if (phase === 'generateSubsections') {

        //     try {
        //         content = '[' + content + ']'
        //         content = JSON.parse(content);
        //         return content;
        //     } catch (e2) {
        //         console.error("generateSubsections array wrapping fix failed:", e2);
        //         console.log("Content at error:", content);
        //     }
        
        } else {
            if (content.charAt(content.length - 1) !== '}') {
                const lastClosingBraceIndex = content.lastIndexOf('}');
                if (lastClosingBraceIndex !== -1) { // Check if brace exists
                    content = content.substring(0, lastClosingBraceIndex + 1);
                }
            }
            if (content.charAt(0) !== '{') {
                content = '{' + content;
            }
        } 

        try {
            return JSON.parse(content); // Retry parsing after healing
        } catch (e2) {
            console.error("JSON healing failed:", e2);
            console.log("Content at error:", content);
            throw e2; // Re-throw the final parsing error
        }
    }
}


function makeRequest(payloads, responseHandler) {
    if (!Array.isArray(payloads)) {
        payloads = [payloads];
    }

    const promises = payloads.map(payload => {
        return fetch(decoderBase, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${decoderKey}`
            },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (!response.ok) {
                newActivity(`Received HTTP error ${response.status}`);
                return response.json().then(errorMessage => {
                    newActivity(`Error message: ${Object.values(errorMessage).map(value => JSON.stringify(value)).join(', ')}`);
                    clearTimeout(timer);
                    throw new Error(`HTTP error! status: ${response.status}`);
                });
            }
            return response.text(); // or response.json() if your API directly returns JSON
        });
    });

    Promise.all(promises)
        .then(rawResponses => {  // <--- rawResponses are now text strings
            responseHandler(rawResponses); // Call the handler with RAW responses
        })
        .catch(error => {
            console.error("Error in makeRequest:", error);
            responseHandler(null, error); // Call handler with error
        });
}
  

function handleApiResponse(responses, error, section) {
    if (error) {
        console.error("Error received in handleApiResponse:", error);
        return;
    }

    if (!responses) {
        console.error("No responses received in handleApiResponse");
        return;
    }

    if (!Array.isArray(responses)) {
        responses = [responses];
    }

    responses.forEach(response => { 
        let fullResponse;
        let content;

        try {
            fullResponse = JSON.parse(response); 
            content = fullResponse.choices[0].message.content; 

            try {
                content = tryParseJson(content); 
            } catch (jsonError) {
                console.error("JSON parse/healing error:", jsonError);
                return; 
            }

            const usage = fullResponse.usage; 

            if (phase === 'refiningRequest') {
                const preamble = content.preamble;
                questions = content.questions;
                let msgStr = preamble + '\n';
                questions.forEach((question, index) => {
                    msgStr += `\n${index + 1}.  ` + question;
                });
                newModelMessageElm();
                addToModalMessage(msgStr);
                addTokenUsageToActivity(usage, undefined, latestTimerId());
                setPhase('refiningQuestionsAsked');
                newActivity('Waiting for task clarification');
                enableBar();

            } else if (phase === 'confirmingValidTopic') {
                console.log(content);
                addTokenUsageToActivity(usage, undefined, latestTimerId());
                if (content.is_valid_request === true) {
                    newActivity('Request confirmed');
                    setPhase('refiningRequest');
                    nextPhase();
                    researchRequest = input;
                } else {
                    newModelMessageElm();
                    addTokenUsageToActivity(usage);
                    newActivity('Prompt was not researchable');
                    newActivity('Awaiting new instructions');
                    setPhase('waitingForInput');
                    addToModalMessage("I apologize, but I cannot proceed with this request. " + content.explanation);
                    enableBar();
                }
                setInterval(() => {
                    let minutes = (elapsedTime / 60);
                    let rpm = (overallTokens['requests'] / minutes).toFixed(1);
                    if (rpm > overallTokens['requests']) {
                        rpm = overallTokens['requests'];
                    }
                    $('.rpm').text(rpm);
                }, 3000);

            } else if (phase === 'refineTaskWithAnsweredQuestions') {
                refinedRequest = content.query;
                refinedFormattingRequirements = content.formatting_requirements;
                refinedContentRequirements = content.content_requirements;
                newModelMessageElm(true);
                addToModalMessage('I refined the query: ' + refinedRequest);
                addToModalMessage('\n\nI will follow these formatting requirements: ' + refinedFormattingRequirements);
                addToModalMessage('\n\nI will include these content requirements: ' + refinedContentRequirements.join(", "));
                addQueryToOutline(content);
                addTokenUsageToActivity(usage, undefined, latestTimerId());
                setPhase('createSections');
                nextPhase();

            } else if (phase === 'createSections') {

                plan = content;
                if (!Array.isArray(plan)) {
                    console.error("Error: The 'plan' is not an array. Check the model's response.");
                    return;
                }
                const sectionTitles = plan.map(section => section.section_title);
                addToModalMessage(`\n\nI have formulated a layout for your report, which will contain the following ${plan.length} sections:.`);
                addToModalMessage('<ul>');
                sectionTitles.forEach(sectionTitle => {
                    addToModalMessage(`<li>${sectionTitle}</li>`);
                });
                addToModalMessage('</ul>');
                if (plan.length > 0) {
                    addToModalMessage(`\n\nI will begin by gathering sources and content required for the ${sectionTitles[0]} section by following this guide: ${plan[0].description}`);
                    $('.current-section').text(`Working on section 1/${sectionTitles.length}`);
                } else {
                    addToModalMessage("\n\nNo sections were generated. Check the input requirements.");
                    $('.current-section').text("No sections.");
                }

                addTokenUsageToActivity(usage, undefined, latestTimerId());
                newActivity('Planned an outline');
                addPlanToOutline();
                setPhase('generateSubsections');
                nextPhase();

            } else if (phase === 'generateSubsections') {
                // content here is the parsed JSON from generateSubsectionsPrompt
            
                if (!Array.isArray(content) || content.length === 0) {
                    console.error("Error: Subsections response is not a valid array. Cannot proceed with document revision.");
                    return; 
                }

                console.log('made subsection')
                section.subsections = content; // Directly assign the 'content' array to the passed 'section'

                let sub = '';
                content.forEach(subsection => {
                    sub += '<div class="outline-sub"><span class="outline-sub-title">' + subsection.subsection_title + '</span>: ' + subsection.subsection_content_requirements + '</div>\n\n'
                })
                $('.outline-subsections').eq(completeSubsections).append(sub)

                addTokenUsageToActivity(usage, section.section_title, section.timer_id); // Ensure 'usage' is in scope

            } else if (phase === 'done') {
                newModelMessageElm(false);
                addToModalMessage(content);
                newActivity('Responded.');
                enableBar();
            }

        } catch (parseError) {
            console.error("Error parsing fullResponse:", parseError);
            return; // Handle fullResponse parsing error
        }
    });
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
        console.log("URL: ", url)
        const $element = $(`.token-count[data-activity-url="${url}"]:not(.activity-error)`).first();
        $element.text(usage.prompt_tokens + ' / ' + usage.completion_tokens + ' / ' + usage.total_tokens + ' tokens' + totalTime + cost);
        $element.parent().find('.activity-header').removeClass('activity-understanding');
    } else {
        $('.token-count:not(.activity-error').first().text(usage.prompt_tokens + ' / ' + usage.completion_tokens + ' / ' + usage.total_tokens + ' tokens' + totalTime + cost);
    }

    if (timerId) {
        console.log(`Stopping timer with id: ${timerId}`)
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

function latestTimerId() {
    return parseInt(Object.keys(activityTimers).pop());
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