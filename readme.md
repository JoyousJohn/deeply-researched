# Deeply Researched

An open-source implementation of OpenAI's Deep Research that aims to replicate its capabilities through prompt chaining with decoder-based language models. (Reasoning model support coming soon.)

## Overview

Mimicing Deep Research, Deeply Researched is a browser-based tool that enhances traditional language model interactions through iterative self-refinement and automated source attribution. The system breaks down complex queries into subtasks, continuously validates its progress, and incorporates relevant web-sourced information to further explore and generate comprehensive responses.

### Performance
Deeply Researched has demonstrated comparable results to Deep Research while maintaining efficiency across various model sizes. Even models as small as Llama 8B and Mistral 7B yield satisfactory results, with 32-70B models already producing excellent responses.

### Key Features
- Iterative task decomposition and validation
- Automated web source discovery and integration
- Token-efficient processing of large datasets 
- Browser-based interface with minimal backend requirements
- No search engine API requirement
- Compatible with various decoder-based language models
- Demonstrated effectiveness across model scales, including compact architectures (8B+ parameters)
- View live cost, runtime, model request, and token breakdowns
- Limit specificity to your likings

## Technical Architecture

The application runs primarily in the browser, utilizing a lightweight Python HTTP server solely for search functionality via the googlesearch-python library. This architecture ensures minimal resource requirements while maintaining advanced research capabilities. 

Future, optional, Brave Search API integration will fully eliminate the need for a backend and allow functionality from a static HTML file.

## Installation

1. Download and extract the repository
2. Ensure Python is installed on your system
3. Navigate to the project directory
4. (Optional) Create and activate a virtual environment`
5. Install dependencies: `` pip install -r requirements.txt ``
6. Start the server: ``python -m http.server``
7. Access the interface through index.html in your browser

## Configuration

1. Access settings the bottom-left corner
2. Configure the following parameters for your OpenAI API-compatible model:
   - Model ID
   - Base URL
   - API key
3. Save your configuration