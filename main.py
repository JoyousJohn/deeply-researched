from googlesearch import search
import requests

def get_links(keywords):
    try:
        return [result for result in search(keywords)]
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 429:
            return {'result': 429}
        raise  # Re-raise the exception for other HTTP errors

from newspaper import Article, ArticleException, Config

config = Config()
config.browser_user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36'

def get_text(url):
    article = Article(url, config=config)
    try:
        article.download()
        article.parse()
        return article.text
    except ArticleException as e:
        print(f"Failed to download article from {url}: {e}")
        return "Error: Unable to retrieve article."

from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.parse
import json

class RequestHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Add CORS headers
        self.send_response(200)  # Send the response status code first
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-type', 'application/json')
        self.end_headers()  # End headers before writing the body
        
        if self.path.startswith('/get_links'):
            parsed_path = urllib.parse.urlparse(self.path)
            query_params = urllib.parse.parse_qs(parsed_path.query)
            
            keywords = query_params.get('keywords', [''])[0]
            links = get_links(keywords)
            
            if isinstance(links, dict) and 'result' in links and links['result'] == 429:
                self.wfile.write(json.dumps(links).encode())
                return
            
            links = links[:10]  # Now safe to slice
            print('Found links: ', links)            
            self.wfile.write(json.dumps({'result': links}).encode())

        elif self.path.startswith('/get_link_texts'):
            parsed_path = urllib.parse.urlparse(self.path)
            query_params = urllib.parse.parse_qs(parsed_path.query)

            links = query_params.get('links', [''])[0].split(',')

            print(f"Received {len(links)} links: {links}")

            texts = []
            for link in links[:3]:
                print(f"Reading url: {link}")
                link_text = get_text(link)
                if (len(link_text)) < 300: continue
                texts.append({
                    'url': link,
                    'length': len(link_text),
                    'text': link_text
                })

            self.wfile.write(json.dumps({'result': texts}).encode())


        
        else:
            super().do_GET()


if __name__ == '__main__':
    server_address = ('', 8000)
    httpd = HTTPServer(server_address, RequestHandler)
    print('Server running on port 8000')
    httpd.serve_forever()
