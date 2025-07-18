from app import app

# This file serves as the entry point for Vercel deployment
# Vercel requires the app to be exposed directly as a module-level variable
# The if __name__ == "__main__": block is ignored in Vercel's serverless environment

# For local development
app = app
    
# For Vercel deployment - this is what Vercel will use
# The app variable is imported and exposed at the module level