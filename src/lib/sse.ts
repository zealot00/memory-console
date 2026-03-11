import { ReadableStreamDefaultController } from "stream/web";

const clients = new Map<string, Set<ReadableStreamDefaultController>>();

export function addSSEClient(agent: string, controller: ReadableStreamDefaultController) {
  if (!clients.has(agent)) {
    clients.set(agent, new Set());
  }
  clients.get(agent)!.add(controller);
}

export function removeSSEClient(agent: string, controller: ReadableStreamDefaultController) {
  if (clients.has(agent)) {
    clients.get(agent)!.delete(controller);
    if (clients.get(agent)!.size === 0) {
      clients.delete(agent);
    }
  }
}

export function broadcastToAgent(agent: string, data: unknown) {
  const agentClients = clients.get(agent);
  if (agentClients) {
    const message = JSON.stringify(data);
    agentClients.forEach(controller => {
      try {
        controller.enqueue(new TextEncoder().encode(`data: ${message}\n\n`));
      } catch (error) {
        console.error(`Failed to send to client:`, error);
        agentClients.delete(controller);
      }
    });
  }
}

export function getConnectedAgents(): string[] {
  return Array.from(clients.keys());
}
