import requests
import json
import time
from datetime import datetime

#http://lipo-agent-production.up.railway.app/

class ElizaAPIClient:
    def __init__(self, base_url="https://lipo-agent-production.up.railway.app"):
        self.base_url = base_url
        self.session = requests.Session()
        
    def get_agents(self):
        """Get list of available agents"""
        try:
            response = self.session.get(f"{self.base_url}/agents")
            response.raise_for_status()
            data = response.json()
            # Response: {"agents": [...]}
            return data.get("agents", [])
        except requests.exceptions.RequestException as e:
            print(f"Error getting agents: {e}")
            return None
    
    def get_agent_details(self, agent_id):
        """Get specific agent details"""
        try:
            response = self.session.get(f"{self.base_url}/agents/{agent_id}")
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error getting agent {agent_id}: {e}")
            return None
    
    def send_message(self, agent_id, message, file_path=None):
        """Send a message to an agent"""
        try:
            # Prepare form data
            data = {
                'text': message,
                'user': 'user'
            }
            
            files = None
            if file_path:
                files = {'file': open(file_path, 'rb')}
            
            response = self.session.post(
                f"{self.base_url}/{agent_id}/message",
                data=data,
                files=files
            )
            response.raise_for_status()
            
            # Close file if opened
            if files:
                files['file'].close()
                
            return response.json()
            
        except requests.exceptions.RequestException as e:
            print(f"Error sending message: {e}")
            return None
    
    def get_message_history(self, agent_id):
        """Get message history for an agent"""
        try:
            response = self.session.get(f"{self.base_url}/{agent_id}/messages")
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error getting messages: {e}")
            return None
    
    def text_to_speech(self, agent_id, text):
        """Convert text to speech"""
        try:
            response = self.session.post(
                f"{self.base_url}/{agent_id}/tts",
                json={'text': text},
                headers={'Content-Type': 'application/json', 'Accept': 'audio/mpeg'}
            )
            response.raise_for_status()
            return response.content
        except requests.exceptions.RequestException as e:
            print(f"Error with TTS: {e}")
            return None
    
    def speech_to_text(self, agent_id, audio_file_path):
        """Convert speech to text using Whisper"""
        try:
            with open(audio_file_path, 'rb') as audio_file:
                files = {'file': ('recording.wav', audio_file, 'audio/wav')}
                response = self.session.post(
                    f"{self.base_url}/{agent_id}/whisper",
                    files=files
                )
                response.raise_for_status()
                return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error with speech-to-text: {e}")
            return None

def chat_session():
    """Start an interactive chat session"""
    client = ElizaAPIClient()
    
    print("🤖 ElizaOS Chat Client")
    print("Connecting to server...")
    
    # Get available agents
    agents = client.get_agents()
    if not agents:
        print("❌ No agents available or server not responding")
        print("Make sure your ElizaOS server is running on https://lipo-agent-production.up.railway.app/")
        return
    
    print(f"✅ Found {len(agents)} agent(s)")
    
    # Display and select agent
    if len(agents) == 1:
        selected_agent = agents[0]
        print(f"Using agent: {selected_agent['name']} ({selected_agent['id'][:8]}...)")
    else:
        print("\nAvailable agents:")
        for i, agent in enumerate(agents):
            print(f"  {i + 1}. {agent['name']} ({agent['id'][:8]}...)")
        
        while True:
            try:
                choice = input("\nSelect agent (1-{}): ".format(len(agents)))
                idx = int(choice) - 1
                if 0 <= idx < len(agents):
                    selected_agent = agents[idx]
                    break
                else:
                    print("Invalid choice. Please try again.")
            except ValueError:
                print("Please enter a number.")
    
    agent_id = selected_agent['id']
    agent_name = selected_agent['name']
    
    # Get agent details
    details = client.get_agent_details(agent_id)
    if details and details.get('character'):
        char = details['character']
        print(f"\n💭 Character: {char.get('name', 'Unknown')}")
        if char.get('description'):
            print(f"📝 Description: {char['description']}")
    
    print(f"\n{'='*60}")
    print(f"🗣️  Chat with {agent_name}")
    print("Commands: 'quit' to exit, 'history' to see past messages, 'clear' to clear screen")
    print(f"{'='*60}")
    
    # Chat loop
    while True:
        try:
            user_input = input(f"\n💬 You: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'q']:
                print("👋 Goodbye!")
                break
            
            if user_input.lower() == 'clear':
                import os
                os.system('cls' if os.name == 'nt' else 'clear')
                continue
            
            if user_input.lower() == 'history':
                print("\n📖 Message History:")
                messages = client.get_message_history(agent_id)
                if messages:
                    for msg in messages[-10:]:  # Show last 10 messages
                        timestamp = datetime.fromtimestamp(
                            msg.get('createdAt', 0) / 1000
                        ).strftime('%H:%M:%S')
                        user = msg.get('user', 'unknown')
                        text = msg.get('text', '')[:100]  # Truncate long messages
                        print(f"  [{timestamp}] {user}: {text}")
                else:
                    print("  No message history found")
                continue
            
            if not user_input:
                continue
            
            print("⏳ Sending message...", agent_id)
            response = client.send_message(agent_id, user_input)
            
            if response and isinstance(response, list):
                for msg in response:
                    user = msg.get('user', 'unknown')
                    text = msg.get('text', '')
                    
                    if user != 'user' and text:  # Only show agent responses
                        print(f"\n🤖 {agent_name}: {text}")
                        
                        # Show additional info if available
                        source = msg.get('source')
                        action = msg.get('action')
                        if source or action:
                            info_parts = []
                            if source:
                                info_parts.append(f"Source: {source}")
                            if action:
                                info_parts.append(f"Action: {action}")
                            print(f"   ℹ️  {' | '.join(info_parts)}")
            else:
                print("❌ Failed to get response from agent")
                
        except KeyboardInterrupt:
            print("\n\n👋 Chat interrupted. Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error: {e}")

def test_endpoints():
    """Test all available endpoints"""
    client = ElizaAPIClient()
    
    print("🧪 Testing ElizaOS API Endpoints")
    print("=" * 40)
    
    # Test /agents
    print("\n1️⃣  Testing GET /agents...")
    agents = client.get_agents()
    if agents:
        print(f"✅ Success: Found {len(agents)} agent(s)")
        for agent in agents:
            print(f"   - {agent['name']} ({agent['id'][:8]}...)")
    else:
        print("❌ Failed to get agents")
        return
    
    agent_id = agents[0]['id']
    agent_name = agents[0]['name']
    
    # Test /agents/{id}
    print(f"\n2️⃣  Testing GET /agents/{agent_id[:8]}...")
    agent_details = client.get_agent_details(agent_id)
    if agent_details:
        print("✅ Success: Got agent details")
        if agent_details.get('character'):
            char = agent_details['character']
            print(f"   Character: {char.get('name', 'Unknown')}")
    else:
        print("❌ Failed to get agent details")
    
    # Test /{id}/message
    print(f"\n3️⃣  Testing POST /{agent_id[:8]}/message...")
    test_message = "Hello! This is a test message from the Python API client."
    response = client.send_message(agent_id, test_message)
    if response:
        print("✅ Success: Message sent and response received")
        agent_responses = [msg for msg in response if msg.get('user') != 'user']
        if agent_responses:
            print(f"   Agent response: {agent_responses[0].get('text', '')[:100]}...")
    else:
        print("❌ Failed to send message")
    
    # Test /{id}/messages
    print(f"\n4️⃣  Testing GET /{agent_id[:8]}/messages...")
    messages = client.get_message_history(agent_id)
    if messages is not None:
        print(f"✅ Success: Retrieved {len(messages)} message(s)")
    else:
        print("❌ Failed to get message history")
    
    # Test /{id}/tts
    print(f"\n5️⃣  Testing POST /{agent_id[:8]}/tts...")
    audio_data = client.text_to_speech(agent_id, "Hello world")
    if audio_data:
        print(f"✅ Success: Received {len(audio_data)} bytes of audio data")
    else:
        print("❌ Failed to get TTS audio")
    
    print(f"\n{'='*40}")
    print("🎉 Endpoint testing complete!")

def send_single_message():
    """Send a single message and show raw response"""
    client = ElizaAPIClient()
    
    agents = client.get_agents()
    if not agents:
        print("❌ No agents available")
        return
    
    agent = agents[0]
    print(f"Using agent: {agent['name']} ({agent['id'][:8]}...)")
    
    message = input("Enter your message: ").strip()
    if not message:
        print("No message entered")
        return
    
    print("Sending message...")
    response = client.send_message(agent['id'], message)
    
    if response:
        print("\n📋 Raw Response:")
        print(json.dumps(response, indent=2))
    else:
        print("❌ Failed to send message")

if __name__ == "__main__":
    print("🚀 ElizaOS API Client")
    print("=" * 30)
    print("1. 💬 Interactive chat")
    print("2. 📤 Send single message")  
    print("3. 🧪 Test all endpoints")
    print("4. 🔍 Show agents only")
    
    choice = input("\nChoose option (1-4): ").strip()
    
    if choice == "1":
        chat_session()
    elif choice == "2":
        send_single_message()
    elif choice == "3":
        test_endpoints()
    elif choice == "4":
        client = ElizaAPIClient()
        agents = client.get_agents()
        if agents:
            print(f"\n📋 Available agents:")
            for agent in agents:
                print(f"  • {agent['name']} (ID: {agent['id']})")
        else:
            print("❌ No agents available")
    else:
        print("❌ Invalid choice")