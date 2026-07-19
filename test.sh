invoke_url='https://integrate.api.nvidia.com/v1/chat/completions'

authorization_header='Authorization: Bearer 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'
accept_header='Accept: application/json'
content_type_header='Content-Type: application/json'

data=$'{
  "model": "z-ai/glm-5.2",
  "messages": [
    {
      "role": "user",
      "content": "What is the capital of France?"
    }
  ],
  "temperature": 1,
  "top_p": 1,
  "max_tokens": 16384,
  "seed": 42,
  "stream": true
}'

response=$(curl --silent -i -w "\n%{http_code}" --request POST \
  --url "$invoke_url" \
  --header "$authorization_header" \
  --header "$accept_header" \
  --header "$content_type_header" \
  --data "$data"
)

echo "$response"s