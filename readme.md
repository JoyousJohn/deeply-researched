# Deeply Researched

An open-source implementation of OpenAI's Deep Research that aims to replicate its capabilities through prompt chaining with decoder-based language models. (Reasoner support soon!)

![deeply_researched_preview](https://github.com/user-attachments/assets/cdd885ec-ebc3-4543-9573-ba9c7f750d7f)
<div style="display: flex; justify-content: space-between;">
    <img src="https://github.com/user-attachments/assets/7cfd1a34-1f2d-4722-9122-44f708bed85d" alt="deeply_researched_home" style="width: 48%;">
    <img src="https://github.com/user-attachments/assets/c1be3c62-439f-4c70-8e6f-89a86924b451" alt="deeply_researched_settings" style="width: 48%;">
</div>



## Overview

Mimicing OpenAI Deep Research, Deeply Researched is a browser-based research tool capable of searching the web with iterative self-refinement. The system breaks down complex queries into subtasks, continuously validates its progress, and automatically locates sources to find and explore relevant information.

### Performance
Deeply Researched has demonstrated comparable results to Deep Research while maintaining efficiency across various model sizes. Even models as small as Llama 8B yield satisfactory results, with 32-70B models already producing great responses.

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

The application runs primarily in the browser, utilizing a lightweight Python ThreadingHTTPServer server solely for search functionality via the googlesearch-python library.

Future, optional, Brave Search API integration will fully eliminate the need for a backend and allow functionality from a static HTML file.

## Installation

1. Download and extract this repository
2. Ensure Python is installed on your system
3. Navigate to the project directory
4. (Optional) Create and activate a virtual environment
5. Install the 3 required dependencies: googlesearch, newspaper, and fake-useragent: `` pip install -r requirements.txt ``
6. Start the server: ``python -m http.server``
7. Access the interface through index.html in your browser

## Configuration

1. Access settings the bottom-left corner
2. Configure the following for your OpenAI API-compatible model:
   - Model ID
   - Base URL
   - API key (saved in browser local storage)
3. Save your configuration

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
<br>
| Llama 3.3 70B Instruct | Great |
| Llama 3.1 70B Instruct | Great |
| Gemini 1.5 Pro | Great |
| Mixtral 8x7B Instruct v0.1 | Great |
| Nova Lite 1.0 | Great |
| MiniMax 01 | Great |
| Jamba 1.5 Large | Great |
<br>
| Llama 3.3 70B Instruct Turbo | Good |
| Llama 3.1 8B Instruct | Good |
| Llama 3.1 8B Instruct Turbo | Good |
| Gemini 1.5 Flash | Good |
| Gemini 1.5 Flash 8B | Good |
<br>
| Mistral Small 3 | Poor |
| Mistral 7B Instruct v0.3 | Poor |
| Claude 3 Haiku | Poor |
| WizardLM-2 8x22B | Poor |
<br>
| Phi 4 | Incompatible |
| Llama 3.2 3B Instruct | Incompatible |
| Llama 3.2 1B Instruct | Incompatible |
| Gemini 2.0 Flash Light Preview 02-05 | Incompatible |
| Mistral Nemo Instruct 2407 | Incompatible |
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