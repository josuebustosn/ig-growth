import os
import sys
from apify_client import ApifyClient

def get_followers(username):
    token = os.environ.get("APIFY_TOKEN")
    if not token:
        print("Error: APIFY_TOKEN environment variable not set.", file=sys.stderr)
        sys.exit(1)

    try:
        # Initialize the ApifyClient with your API token
        client = ApifyClient(token)

        # Prepare the Actor input
        run_input = { "usernames": [username] }

        # Run the Actor and wait for it to finish
        # Actor: instagram-scraper (7RQ4RlfRihUhflQtJ)
        run = client.actor("7RQ4RlfRihUhflQtJ").call(run_input=run_input)

        if not run:
            print("Error: Apify run failed to start or return.", file=sys.stderr)
            sys.exit(1)

        # Fetch results from the run's dataset
        dataset_items = client.dataset(run["defaultDatasetId"]).list_items().items
        
        if not dataset_items:
            print(f"Error: No data returned for user {username}", file=sys.stderr)
            sys.exit(1)

        # Extract followers count
        # The structure depends on the specific actor, but usually it's 'followersCount' or similar.
        # Based on standard Apify Instagram scrapers, it's often 'followersCount'.
        user_data = dataset_items[0]
        followers = user_data.get("followersCount")
        
        if followers is None:
             # Fallback check for other common keys just in case
            followers = user_data.get("followers")

        if followers is not None:
            print(int(followers))
        else:
            print(f"Error: Could not find followers count in response: {user_data.keys()}", file=sys.stderr)
            sys.exit(1)

    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python get_followers.py <username>", file=sys.stderr)
        sys.exit(1)
        
    username = sys.argv[1]
    get_followers(username)
