# Gambit Group Assessment

This repository contains a collection of assessments.

Each assessment located respectively in `./assessments/*` dir is designed to evaluate different skills and competencies relevant to the roles within the company. You may not required to do all the assessments (you can if you want), but ensure that you complete the mandatory ones as specified in the email you received.

Each assessment is self-contained and includes its own instruction in the `README.md` file located in the respective assessment folder. Please read the instructions carefully before starting each assessment. Each assessment should not take you more than 20 minutes to complete.

## How to submit

1. **Clone this repository** (do not "fork" it please):
   ```bash
   git clone https://github.com/Gambit-Group/assessment.git
   cd assessment
   ```

2. **Create your own private repository** on GitHub.

3. **Push your cloned repository** to your private repository:
   ```bash
   git remote remove origin
   git remote add origin <your-private-repository-url>
   git push -u origin main
   ```

4. **Grant access** to the following GitHub usernames by adding them as collaborators to your private repository:
   - `claytonchew`
   - `chunghanlaugambit`

   To add collaborators on GitHub:
   - Go to your repository settings
   - Navigate to "Collaborators and teams"
   - Click "Add people"
   - Enter each username and grant them access

5. **Notify us** with your private repository link once you've completed the assessment and granted access, so we can review your submission.

## Get Started

To set up your environment and begin working on the assessments, there are a couple of options.

**Option 1: Use mise (recommended)**

1. Install mise by following the instructions on their [doc](https://mise.jdx.dev/getting-started.html). If you are already using mise, you can skip this step but make sure to trust the repository by running `mise trust` in the root of this repository.
2. Run `mise install` to install the necessary dependencies for the assessments.
3. Finally, do `pnpm install`.

**Option 2: Using Node Version Manager (NVM.sh)**

1. Install NVM by following the instructions on their [GitHub page](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating). If you are already using NVM, you can skip this step.
2. Then run `nvm use`. This command will automatically detect `.nvmrc` file in the root of the repository and switch to the specified Node.js version.
3. Then run `corepack enable` to enable Corepack, which will allow you to use the package manager specified in the project.
4. Finally, do `pnpm install`.

**Option 3: Using Node.js directly (NOT recommended)**

1. Install Node.js by following the instructions on their [official website](https://nodejs.org/). Make sure to install version v24.
2. After installing Node.js, run `corepack enable` to enable Corepack, which will allow you to use the package manager specified in the project.
4. Finally, do `pnpm install`.

Next, make sure you have [Docker](https://docker.com) installed in your system. If you are using Mac, using [Orbstack](https://orbstack.com) is fine. To find out if you actually have docker installed, try run `docker --version` in your terminal. If you see a version number, then you have Docker installed. If not, you will need to install it before proceeding with the assessments.

Optionally, you may ensure your IDE has `biome` plugin installed for linting and formatting.
