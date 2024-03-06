
**Frontend - **

<span style="text-decoration:underline;">Tech Stacks - </span>



* <span style="text-decoration:underline;">React.js </span>- React.js is a component-based JavaScript library that utilizes a declarative approach, virtual DOM, and JSX syntax to efficiently render user interfaces with reactive and scalable components for building single-page applications.
* <span style="text-decoration:underline;">SCSS </span>-  SCSS, or Sassy CSS, is a superset of CSS that offers additional features and capabilities to enhance the styling workflow in web development projects.

<span style="text-decoration:underline;">Documentation -</span>



* <span style="text-decoration:underline;">Components </span>- The components directory contains all of the components used in the frontend.These components are modular, self-contained units that encapsulate specific functionality or UI elements. Organizing components into a dedicated directory helps maintain a clean and structured project architecture, making it easier to locate, reuse, and manage individual components across different parts of the application
* <span style="text-decoration:underline;">Pages </span>- The pages directory contains all of the pagesused in the frontend.These pages are composed of the components directory.Organizing pagesinto a dedicated directory helps maintain a clean and structured project architecture, too.
* <span style="text-decoration:underline;">Assets </span>- the assets directory houses static files such as images, icons, and other media resources used in the application's UI. These files are often referenced by components to enhance the visual presentation and user experience. Organizing assets into a dedicated directory helps maintain a clear separation between code and static resources, making it easier to manage and update them.
* <span style="text-decoration:underline;">Redux </span>- The "redux" directory typically contains files related to state management using the Redux library in a React application. This directory serves as a central hub for Redux-related logic, including actions, reducers, selectors, and middleware. By organizing Redux-related files into a dedicated folder, developers can maintain a clear separation of concerns and facilitate easier navigation and understanding of the application's state management architecture.
* <span style="text-decoration:underline;">Main.jsx -</span>  The "main.jsx" file serves as the entry point or main file for the application's React components. It often acts as the central hub where various components are imported, initialized, and rendered within the application's DOM structure. The "main.jsx" file is crucial for bootstrapping the React application and orchestrating the overall user interface.
* <span style="text-decoration:underline;">App.jsx -</span>  The "App.jsx" file is a central component that typically serves as the main container for the application's user interface. It encapsulates the structure of the entire application and orchestrates the rendering of various components within it. 

	

<span style="text-decoration:underline;"> </span>

**Backend **-

<span style="text-decoration:underline;">Tech Stacks - </span>



* <span style="text-decoration:underline;">Nodejs</span> - Node.js is used for a variety of reasons, including its non-blocking, event-driven architecture, which makes it highly efficient for building scalable and real-time applications.
* <span style="text-decoration:underline;">Express</span> - Express.js is used for its simplicity in building web applications and APIs with Node.js. It offers routing, middleware for request processing, static file serving, easy integration with other libraries like MongoDB, and flexibility without imposing strict conventions, making it a popular choice for web development.
* <span style="text-decoration:underline;">MongoDB </span> - MongoDB offers a flexible, scalable, and high-performance NoSQL database solution. Its document-oriented model allows for easy storage and retrieval of structured and semi-structured data, making it ideal for diverse applications like web development, real-time analytics, and content management systems. Additionally, its distributed architecture supports horizontal scaling and high availability.

<span style="text-decoration:underline;">Documentation </span>- 



* <span style="text-decoration:underline;">server/db </span>- The code defines constants for different types of data in a chat application. It establishes a connection to a MongoDB database using the MongoClient module, storing the database object for later use. The connectDB function asynchronously connects to the database using the provided URL. If successful, it assigns the database object to the 'db' variable; otherwise, it passes any errors to the 'done' callback function.
* <span style="text-decoration:underline;">server/helper/chat.js</span>  - The provided module offers functions to interact with MongoDB for managing chat data. Functions include adding new responses, updating existing chats, retrieving chat history, and managing file attachments. These operations are performed based on user and chat identifiers, ensuring efficient chat management within the application.
* <span style="text-decoration:underline;">server/helper/user.js</span> - This module provides functions for user authentication and profile management. It includes sign-up, login, password reset, and profile update functionalities. User data is stored in MongoDB collections, with password encryption using bcrypt. It utilizes temporary collections for pending sign-ups and password reset requests, ensuring secure and efficient user management. Additionally, it integrates with AWS S3 for profile picture uploads. These features collectively offer a robust and secure user authentication and profile management system for applications.
* <span style="text-decoration:underline;">server/mail</span> - This module utilizes Nodemailer to send emails through Gmail's SMTP server. It retrieves email credentials and configuration from environment variables using dotenv. The createTransport function sets up the email service with Gmail, and sendMail sends an email with specified recipients, subject, and HTML content. Error handling logs any encountered errors, while successful email delivery logs confirmation. This setup enables sending emails for various purposes within applications, such as notifications, verifications, or communication features.
* <span style="text-decoration:underline;">server/routes/chat.js</span> - This Express router handles various API endpoints for interacting with a chat system. It incorporates authentication middleware to verify user identity via JWT tokens. The routes support functionalities like sending and receiving messages, retrieving chat history, managing attachments, and deleting chat records. It utilizes OpenAI's API for natural language processing tasks and MongoDB for data storage. Error handling ensures proper responses for various scenarios, such as missing data or internal server errors. Overall, the router provides a robust backend for real-time chat applications with advanced features like AI assistance and file attachments.
* <span style="text-decoration:underline;">server/routes/user.js</span> - This JavaScript file contains an Express.js router for handling various authentication and user-related functionalities. It includes routes for signing up, logging in, updating profiles, handling forgotten passwords, sending OTPs (one-time passwords), and more. The code uses MongoDB for database operations and nodemailer for sending emails. It also utilises JWT (JSON Web Tokens) for user authentication and authorization. The file follows a modular structure and incorporates error handling for various scenarios. Overall, it provides a robust backend infrastructure for managing user accounts and authentication processes in a web application.

**Deployment - **

Tech Stack - 



* <span style="text-decoration:underline;">AWS </span>-  Services used are S3 and EC2. Amazon S3 (Simple Storage Service) is a scalable cloud storage service, ideal for storing and retrieving any amount of data from anywhere. Amazon EC2 (Elastic Compute Cloud) provides resizable compute capacity in the cloud, enabling developers to deploy and manage virtual servers for various computing needs.
* <span style="text-decoration:underline;">Docker </span>- Docker is a platform for developing, shipping, and running applications using containerization technology. It allows developers to package their applications and dependencies into lightweight containers that can run consistently across different environments, making it easier to build, deploy, and manage software applications at scale.

Documentation - 



* <span style="text-decoration:underline;">client/Dockerfile</span> - This Dockerfile sets up a Node.js environment using the Alpine Linux base image. It installs dependencies, copies project files, exposes port 80, and runs the application in development mode using the command "npm run dev".
* <span style="text-decoration:underline;">server/Dockerfile</span> - This Dockerfile creates a Node.js environment with Alpine Linux. It installs dependencies, copies project files, exposes port 5000, and runs the application using the command "npm start" with the addition of "nodeman" for development auto-reloading.
* <span style="text-decoration:underline;">docker-compose.yml</span> - This Docker Compose file defines two services: "server" and "client". Each service builds from its respective Dockerfile, exposes ports, and establishes communication links between them. The "client" service maps port 80, while "server" maps port 5000, facilitating communication between the two services.
* <span style="text-decoration:underline;">S3 Bucket</span> - Used to store the profile picture uploaded by the user so that it can be easily displayed on the interface.
* <span style="text-decoration:underline;">EC2</span> - Running the Dockerfile on an EC2 instance allows you to deploy and manage your application in a scalable and flexible environment. EC2 instances provide virtual servers in the cloud, enabling you to host and run your Docker containers with ease. By using EC2, you can take advantage of its scalability, reliability, and cost-effectiveness for hosting your Dockerized application. The Public IP of the EC2 instance is [3.145.122.144](http://3.145.122.144) .



