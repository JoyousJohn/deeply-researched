# Deeply Researched

An open-source implementation of OpenAI's Deep Research that aims to replicate its capabilities through prompt chaining with decoder-based language models. (Reasoner support soon!)

https://github.com/user-attachments/assets/980cd4be-7ccf-48e9-b696-3c3cc4f52c5d

![deeply_researched_preview](https://github.com/user-attachments/assets/cdd885ec-ebc3-4543-9573-ba9c7f750d7f)
<div style="display: flex; justify-content: space-between;">
    <img src="https://github.com/user-attachments/assets/7cfd1a34-1f2d-4722-9122-44f708bed85d" alt="deeply_researched_home" style="width: 48%;">
    <img src="https://github.com/user-attachments/assets/c1be3c62-439f-4c70-8e6f-89a86924b451" alt="deeply_researched_settings" style="width: 48%;">
</div>



## Overview

Mimicing OpenAI Deep Research, Deeply Researched is a browser-based research tool capable of searching the web with iterative self-refinement. The system breaks down complex queries into subtasks, continuously validates its progress, and automatically locates sources to find and explore relevant information.

### Performance
Deeply Researched has demonstrated comparable results to Deep Research while maintaining efficiency across various model sizes. Even models as small as Llama 8B yield satisfactory results, with inexpensive Nova Lite 1.0 already producing stellar outputs.

### Key Features
- Iterative task decomposition and validation
- Automated web source discovery and integration
- Token-efficient processing of large datasets via mapping 
- Browser-based interface with minimal backend requirements
- No search engine API requirement
- Compatible with various decoder-based language models
- Demonstrated effectiveness across model scales, including compact architectures (8B+ parameters)
- View live cost, runtime, model request, and token breakdowns
- Limit specificity to your likings
- 429 error handling (thus compatible with free, rate-limited providers!)

## Technical Architecture

Deeply Researched runs mainly in browser, using a lightweight Python ThreadingHTTPServer server solely for search engine functionality.

Future, optional, Brave Search API integration will fully eliminate the need for a backend and allow functionality from a static HTML file.

## Installation

1. Clone or download and extract this repository
2. Ensure Python is installed on your system
3. Navigate to the project directory
4. (Optional) Create and activate a virtual environment
5. Install dependencies: `` pip install -r requirements.txt ``
6. Start the server: ``py main.py``
7. Access the interface through index.html in your browser

## Configuration

1. Access settings the bottom-left corner
2. Configure the following for your OpenAI API-compatible model:
   - Model ID
   - Base URL
   - API key (saved in browser local storage)
3. Save your configuration

## Modification

Deeply Research primarily functions by recursive prompting. All prompts are located in ``js/prompt.js`` in order of which they're called and can be modified to your liking to test alternative behavior.

## How it Works

1. The user enters a task, research query, or directive
2. This prompt is analyzed for missing information and brevity and follow-up questions are asked to refine the task as many times as needed
3. The initial prompt and follow-up answers are used to formulate a formal research query, required materials, and requisite formatting instructions
4. The formal query is refined to ensure completeness and strict instruction following
5. The query is broken down into discrete sections to be independently completed
6. The outline is refined to confirm alignment with user prompts
7. For each section:
   1. Initial sources are fetched and contents analyzed and indexed, irrelevant sources are discarded
   2. Remaining required information is highlighted
   3. The web is recursively searched until all source information is found, including initiating advanced search subtasks where needed
   4. Relevant sources are selected
   5. A draft response is generated
   6. The draft is refined to eliminate repetition
   7. The section is confirmed to comply with requirements, else backtrack to the required step above and recurse
   8. Text near the end of the prior section is rewritten to ensure a smooth transition
   9. Section is confirmed to still follow all required formatting after all refinement
8. The final response is assembled and undergoes final validation
9. Final response is shown and Deeply Seeked waits for additional instructions 

Notably, excessively large contexts are never sent to the model. This prompt chaining allows even SMLs to abide by strict and complex instruction following to produce excellent responses at a low cost with minimal token-throughput. The only downside with this precise thinking is the required inference time.

## Tested Model Results

Different models of similar sizes have shown vastly different performance. Many models seem to especially struggle with verifying if source context is sufficient and require a timeout. I recommend testing multiple models to achieve your specific use case. My general benchmarks have shown the following performance:

| Model      | Performance |
|------------|--------|
| DeekSeek V3 | Excellent |
| Gemini 2.0 Flash | Excellent |
| Llama 3.1 405B Instruct | Excellent |
| GPT-4o mini | Excellent |
| Nova Pro 1.0 | Excellent |
| Mistral Large 2411 | Excellent |
| | |
| Llama 3.3 70B Instruct | Great |
| Llama 3.1 70B Instruct | Great |
| Gemini 1.5 Pro | Great |
| Mixtral 8x7B Instruct v0.1 | Great |
| Nova Lite 1.0 | Great |
| MiniMax 01 | Great |
| Jamba 1.5 Large | Great |
| | |
| Llama 3.3 70B Instruct Turbo | Good |
| Llama 3.1 8B Instruct | Good |
| Llama 3.1 8B Instruct Turbo | Good |
| Gemini 1.5 Flash | Good |
| Gemini 1.5 Flash 8B | Good |
| | |
| Mistral Small 3 | Poor |
| Mistral 7B Instruct v0.3 | Poor |
| Claude 3 Haiku | Poor |
| WizardLM-2 8x22B | Poor |
| Euryale 3.1 70B v2.2 | Poor |
| Mistral Nemo Instruct 2407 | Poor |
| Command R Plus | Incompatible |
| | |
| Phi 4 | Incompatible |
| Llama 3.2 3B Instruct | Incompatible |
| Llama 3.2 1B Instruct | Incompatible |
| Gemini 2.0 Flash Light Preview 02-05 | Incompatible |
| Qwen 2.5 72B Instruct | Incompatible |
| Gemini 2.0 Pro (Exp) | Incompatible |
| LFM 7B | Incompatible |
| Ministral 3B | Incompatible |
| Nova Micro 1.0 | Incompatible |
| Command R7B | Incompatible |
| Qwen2.5 Turbo | Incompatible |
| Ministral 8B | Incompatible |
| Phi 3.5 Mini Instruct | Incompatible |
| LFM 40B | Incompatible |
| Command R 08-24 | Incompatible |
| Jamba 1.5 Mini | Incompatible |
| Codestral Mamba | Incompatible |
| Codestral 2501 | Incompatible |
| Qwen Plus | Incompatible |
| Jamba Instruct | Incompatible |

 Models labeled "incompatible" cannot return valid, structured, and sensical responses consistently and in a cost-effective manner without requiring excessive attempts.
