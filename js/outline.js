function addPlanToOutline() {

    plan.forEach((section, index) => {
        
        const $outlineSection = $(`
        <div class="flex flex-col gap-y-1rem">
            
            <div class="flex">
                <div class="section-dropdown flex items-center">▼ </div>
                <div class="outline-section-title">${section.section_title}</div>
            </div>

            <div class="outline-section-desc none" data-outline-section=${index}>${section.description}</div>
            <div class="outline-section-keywords none">Keywords: ${section.search_keywords}</div>

        </div>`)

        $outlineSection.click(function() {
            const $desc = $(this).closest('.flex-col').find('.outline-section-desc, .outline-section-keywords');
            const $dropdown = $(this).find('.section-dropdown');
            if ($desc.is(':visible')) {
                $desc.slideUp();
                $dropdown.text('▼ ');
            } else {
                $desc.slideDown();
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

        $('.outline').append($outlineSection)

    });

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
        <div class="outline-section-keywords none">Content: ${content_requirements}</div>

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

    $('.outline').append($outlineSection)

}