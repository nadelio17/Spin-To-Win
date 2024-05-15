package spintowin;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;

@SuppressWarnings("restriction")
public class SimpleHttpServer1 {
    
    public static void main(String[] args) throws IOException {
        // Create an HTTP server on port 8000
        HttpServer server = HttpServer.create(new InetSocketAddress(8000), 0);
        
        // Define the request handler for the path "/resource1"
        server.createContext("/resource1", new Resource1Handler());
        
        // Define the request handler for the path "/resource2"
        server.createContext("/resource2", new Resource2Handler());
        
        // Define the request handler for retrieving player details by ID
        server.createContext("/player", new PlayerHandler());
        server.createContext("/player/name", new PlayerHandlerName());
        server.createContext("/player/new", new PlayerHandlerNew());
        // Start the server
        server.start();
        
        System.out.println("Server started on port 8000");
    }
}

// Request handler for the path "/resource1"
class Resource1Handler implements HttpHandler {
    @Override
    public void handle(HttpExchange exchange) throws IOException {
        System.out.println("Received request for /resource1");
        
        String response = "Babam Babam";
        try (OutputStream os = exchange.getResponseBody()) {
            exchange.sendResponseHeaders(200, response.getBytes().length);
            os.write(response.getBytes());
        }
    }
}

// Request handler for the path "/resource2"
class Resource2Handler implements HttpHandler {
    @Override
    public void handle(HttpExchange exchange) throws IOException {
        String requestPath = exchange.getRequestURI().getPath();
        String[] parts = requestPath.split("/");

        // Check if the request path has the expected format
        if (parts.length != 3 || !parts[1].equals("resource2")) {
            exchange.sendResponseHeaders(404, 0); // Send a 404 response if the path is not correct
            return;
        }

        try {
            // Extract the number from the URL part after /resource2/
            int number = Integer.parseInt(parts[2]);
            
            // Calculate the double of the number
            int result = number * 2;
            
            // Prepare the response
            String response = String.valueOf(result);
            
            // Send the response
            try (OutputStream os = exchange.getResponseBody()) {
                exchange.sendResponseHeaders(200, response.getBytes().length);
                os.write(response.getBytes());
            }
        } catch (NumberFormatException e) {
            // Send a 400 response if the number is not valid
            exchange.sendResponseHeaders(400, 0);
        }
    }
}
class PlayerHandler implements HttpHandler {
    @Override
    public void handle(HttpExchange exchange) throws IOException {
        // Extracting the ID from the request path
        String requestPath = exchange.getRequestURI().getPath();
        String[] parts = requestPath.split("/");

        // Check if the request path has the expected format
        if (parts.length != 3 || !parts[1].equals("player")) {
            exchange.sendResponseHeaders(404, 0); // Send a 404 response if the path is not correct
            return;
        }

        try {
            // Extract the player ID from the URL part after /player/
            int playerId = Integer.parseInt(parts[2]);
            
            // Call getJoueurById to retrieve player details
            Joueur playerDetails = DatabaseManager.getJoueurById(playerId);
            
            // Check if the player exists
            if (playerDetails != null) {
                // Convert playerDetails to a string representation
                String playerDetailsString = playerDetails.toString();
                
                // Send the player details as response
                byte[] responseBytes = playerDetailsString.getBytes();
                exchange.sendResponseHeaders(200, responseBytes.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(responseBytes);
                }
            } else {
                // Send a 404 response if the player does not exist
                exchange.sendResponseHeaders(404, 0);
            }
        } catch (NumberFormatException e) {
            // Send a 400 response if the ID is not valid
            exchange.sendResponseHeaders(400, 0);
        }
    }}

class PlayerHandlerName implements HttpHandler {
    @Override
    public void handle(HttpExchange exchange) throws IOException {
        // Extraction du pseudo à partir du chemin de la requête
        String requestPath = exchange.getRequestURI().getPath();
        String[] parts = requestPath.split("/");

        // Vérifier si le chemin de la requête a le format attendu
        if (parts.length != 4 || !parts[1].equals("player") || !parts[2].equals("name")) {
            exchange.sendResponseHeaders(404, 0); // Envoyer une réponse 404 si le chemin n'est pas correct
            return;
        }

        try {
            // Extract the player pseudo from the URL part after /player/name/
            String joueurPseudo = parts[3];
            
            // Appeler getJoueurByName pour récupérer les détails du joueur
            Joueur playerDetails = DatabaseManager.getJoueurByName(joueurPseudo);
            
            // Vérifier si le joueur existe
            if (playerDetails != null) {
                // Convertir playerDetails en une représentation sous forme de chaîne de caractères
                String playerDetailsString = playerDetails.toString();
                
                // Envoyer les détails du joueur en tant que réponse
                byte[] responseBytes = playerDetailsString.getBytes();
                exchange.sendResponseHeaders(200, responseBytes.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(responseBytes);
                }
            } else {
                // Envoyer une réponse 404 si le joueur n'existe pas
                exchange.sendResponseHeaders(404, 0);
            }
        } catch (NumberFormatException e) {
            // Envoyer une réponse 400 si l'ID n'est pas valide
            exchange.sendResponseHeaders(400, 0);
        }
    }
}

class PlayerHandlerNew implements HttpHandler {
    @Override
    public void handle(HttpExchange exchange) throws IOException {
        // Vérifier si la méthode HTTP est PUT
        if (!exchange.getRequestMethod().equalsIgnoreCase("PUT")) {
            exchange.sendResponseHeaders(405, 0); // Envoyer une réponse 405 (Method Not Allowed) si la méthode n'est pas PUT
            return;
        }

        try {
            // Lire le corps de la requête pour obtenir les données du joueur
            InputStreamReader isr = new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8);
            BufferedReader br = new BufferedReader(isr);
            StringBuilder requestBody = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) {
                requestBody.append(line);
            }

            // Convertir le JSON en objet Joueur
            ObjectMapper objectMapper = new ObjectMapper();
            Joueur newPlayer = objectMapper.readValue(requestBody.toString(), Joueur.class);

            // Appeler la fonction pour créer le joueur en base de données
            DatabaseManager databaseManager = new DatabaseManager();
            databaseManager.createPlayerFromRequestData(newPlayer);

            // Envoyer une réponse 201 (Created)
            exchange.sendResponseHeaders(201, 0);
        } catch (Exception e) {
            // En cas d'erreur, envoyer une réponse 500 (Internal Server Error)
            exchange.sendResponseHeaders(500, 0);
        }
    }
}

	


