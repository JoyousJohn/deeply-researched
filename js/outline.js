let shownIteration = 1;

function addPlanToOutline() {

    $(`[data-plan-number]`).hide();
    $('.iteration').show();

    const planNum = priorPlans.length + 1
    shownIteration = priorPlans.length + 1

    // alert(planNum)

    plan.forEach((section, index) => {
        
        const $outlineSection = $(`
        <div class="flex flex-col gap-y-1rem" data-plan-number="${planNum}">
            
            <div class="flex">
                <div class="section-dropdown flex items-center">▼ </div>
                <div class="outline-section-title">${section.section_title}</div>
            </div>

            <div class="outline-section-desc none" data-outline-section=${index}>${section.description}</div>
            <div class="outline-subsections flex flex-col gap-y-1rem"></div>

        </div>`)

        $outlineSection.click(function() {
            const $desc = $(this).closest('.flex-col').find('.outline-section-desc, .outline-section-keywords, .outline-subsections');
            const $dropdown = $(this).find('.section-dropdown');
            if ($desc.is(':visible')) {
                $desc.slideUp('fast');
                $dropdown.text('▼ ');
            } else {
                $desc.slideDown('fast');
                $dropdown.text('▲ ');
            }
        })
        .hover(function() {
            $(this).find('.section-dropdown').css('color', '#444dbf')
            $(this).find('.outline-section-title').css('color', '#a3a3a3')
        })
        .mouseleave(function() {
            $(this).find('.section-dropdown').css('color', 'rgb(131, 135, 192)');
            $(this).find('.outline-section-title').css('color', '#f1f1f1');
        })

        $('.outline-sections').append($outlineSection)


        $('.iteration-title').text(`Iteration ${planNum}/${planNum}`).show();

    });

    if (Object.keys(planChanges).length !== 0) {
        $(`.iteration-why`).append($(`<div data-plan-number="${planNum}" style="white-space: pre-wrap;"><span>${planChanges.format}\n\n${planChanges.content}</span>
        </div>`));
    }

}

function addQueryToOutline(context) {

    const query = context.query
    const formatting_requirements = context.formatting_requirements
    const content_requirements = context.content_requirements

    const $outlineSection = $(`
    <div class="flex flex-col gap-y-1rem">
        
        <div class="flex">
            <div class="section-dropdown flex items-center">▼ </div>
            <div class="outline-section-title">Research Query</div>
        </div>

        <div class="outline-section-desc none">${query}</div>
        <div class="outline-section-keywords none">Formatting: ${formatting_requirements}</div>
        <div class="outline-section-keywords none">Content: ${content_requirements.join(", ")}</div>

    </div>`)

    $outlineSection.click(function() {
        const $desc = $(this).closest('.flex-col').find('.outline-section-desc, .outline-section-keywords');
        const $dropdown = $(this).find('.section-dropdown');
        if ($desc.is(':visible')) {
            $desc.slideUp();
            $dropdown.text('▼ ');
        } else {
            $desc.slideDown('fast');
            $dropdown.text('▲ ');
        }
    })
    .hover(function() {
        $(this).find('.section-dropdown').css('color', '#444dbf')
        $(this).find('.outline-section-title').css('color', '#a3a3a3')
    })
    .mouseleave(function() {
        $(this).find('.section-dropdown').css('color', 'rgb(131, 135, 192)');
        $(this).find('.outline-section-title').css('color', '#f1f1f1');
    })

    $('.outline-query').append($outlineSection)
}

$('.iteration-back').click(function() {
    if (shownIteration === 1) {
        return
    }

    shownIteration--;
    $(`[data-plan-number]`).hide();
    $(`[data-plan-number="${shownIteration}"]`).show();
    $('.iteration-title').text(`Iteration ${shownIteration}/${priorPlans.length+1}`)
})

$('.iteration-forward').click(function() {
    if (shownIteration === priorPlans.length + 1) {
        return
    }

    shownIteration++;
    $(`[data-plan-number]`).hide();
    $(`[data-plan-number="${shownIteration}"]`).show();
    $('.iteration-title').text(`Iteration ${shownIteration}/${priorPlans.length+1}`)
})