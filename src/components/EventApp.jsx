import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import contractJson from "../abi/EventBooking.json";

const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export default function EventApp() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [events, setEvents] = useState([]);
  const [owner, setOwner] = useState("");
  const [newEventName, setNewEventName] = useState("");
  const [newEventCapacity, setNewEventCapacity] = useState("");

  useEffect(() => {
    connectWallet();
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Veuillez installer MetaMask.");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const currentAccount = accounts[0];
      setAccount(currentAccount);

      const signer = await provider.getSigner();
      const eventContract = new ethers.Contract(
        contractAddress,
        contractJson.abi,
        signer
      );

      setContract(eventContract);
      const ownerAddress = await eventContract.owner();
      setOwner(ownerAddress);

      fetchEvents(eventContract, currentAccount);
    } catch (err) {
      console.error("Erreur de connexion :", err);
    }
  };

  const fetchEvents = async (contract, userAddress) => {
    if (!userAddress) return;

    try {
      const count = await contract.eventCount();
      const tempEvents = [];

      for (let i = 0; i < count; i++) {
        const ev = await contract.events(i);
        const reserved = await contract.reservations(userAddress, i);
        tempEvents.push({
          id: i,
          name: ev.name,
          capacity: ev.capacity.toString(),
          registered: ev.registered.toString(),
          reserved,
        });
      }

      setEvents(tempEvents);
    } catch (error) {
      console.error("Erreur lors du chargement des événements :", error);
    }
  };

  const handleReserve = async (eventId) => {
    try {
      const tx = await contract.reserve(eventId);
      await tx.wait();
      alert("Réservation réussie !");
      fetchEvents(contract, account);
    } catch (error) {
      alert("Erreur : " + (error.info?.error?.message || error.message));
    }
  };

  const handleCreateEvent = async () => {
    if (!newEventName || !newEventCapacity) {
      alert("Veuillez remplir tous les champs.");
      return;
    }

    try {
      const tx = await contract.createEvent(
        newEventName,
        parseInt(newEventCapacity)
      );
      await tx.wait();
      alert("Événement créé !");
      setNewEventName("");
      setNewEventCapacity("");
      fetchEvents(contract, account);
    } catch (err) {
      alert("Erreur : " + (err.info?.error?.message || err.message));
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-6">
        DApp Réservation d'Événements
      </h1>

      <div className="mb-6 bg-gray-100 p-4 rounded shadow">
        <p className="text-sm text-gray-600">
          Connecté en tant que :
          <span className="font-mono text-blue-600 ml-2">
            {account || "Aucun"}
          </span>
          {account.toLowerCase() === owner.toLowerCase() && (
            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
              Admin
            </span>
          )}
        </p>
      </div>

      {account.toLowerCase() === owner.toLowerCase() && (
        <div className="mb-8 p-4 bg-white shadow rounded border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Créer un événement</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              placeholder="Nom de l'événement"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              className="border p-2 rounded w-full sm:w-1/2"
            />
            <input
              type="number"
              placeholder="Capacité"
              value={newEventCapacity}
              onChange={(e) => setNewEventCapacity(e.target.value)}
              className="border p-2 rounded w-full sm:w-1/3"
            />
            <button
              onClick={handleCreateEvent}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Créer
            </button>
          </div>
        </div>
      )}

      <h2 className="text-xl font-semibold mb-4">Événements disponibles</h2>
      {events.length === 0 ? (
        <p className="text-gray-600">Aucun événement trouvé.</p>
      ) : (
        <div className="space-y-4">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="border p-4 rounded bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between"
            >
              <div>
                <p className="text-lg font-bold">{ev.name}</p>
                <p className="text-sm text-gray-600">
                  Capacité : {ev.capacity} —{" "}
                  {parseInt(ev.capacity) - parseInt(ev.registered)} places
                  restantes
                </p>
              </div>
              <button
                onClick={() => handleReserve(ev.id)}
                disabled={
                  ev.reserved ||
                  parseInt(ev.registered) >= parseInt(ev.capacity)
                }
                className={`mt-2 sm:mt-0 px-4 py-2 rounded text-white font-semibold ${
                  ev.reserved ||
                  parseInt(ev.registered) >= parseInt(ev.capacity)
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {ev.reserved
                  ? "Déjà réservé"
                  : parseInt(ev.registered) >= parseInt(ev.capacity)
                  ? "Complet"
                  : "Réserver"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
