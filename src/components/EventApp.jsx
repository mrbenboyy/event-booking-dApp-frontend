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
    <div className="p-5">
      <h2>
        Connecté en tant que : {account}{" "}
        {account.toLowerCase() === owner.toLowerCase() && (
          <span style={{ color: "green" }}>(Admin)</span>
        )}
      </h2>

      {/* Formulaire pour l'admin */}
      {account.toLowerCase() === owner.toLowerCase() && (
        <div
          style={{
            marginBottom: "20px",
            border: "1px solid #ccc",
            padding: "10px",
          }}
        >
          <h3>Créer un nouvel événement</h3>
          <input
            type="text"
            placeholder="Nom de l'événement"
            value={newEventName}
            onChange={(e) => setNewEventName(e.target.value)}
            style={{ marginRight: "10px" }}
          />
          <input
            type="number"
            placeholder="Capacité"
            value={newEventCapacity}
            onChange={(e) => setNewEventCapacity(e.target.value)}
            style={{ marginRight: "10px" }}
          />
          <button onClick={handleCreateEvent}>Créer</button>
        </div>
      )}

      <h3>Événements disponibles :</h3>
      {events.length === 0 && <p>Aucun événement trouvé.</p>}
      {events.map((ev) => (
        <div
          key={ev.id}
          style={{
            border: "1px solid gray",
            padding: "10px",
            marginBottom: "10px",
          }}
        >
          <p>
            <strong>{ev.name}</strong>
          </p>
          <p>Capacité : {ev.capacity}</p>
          <p>
            Places restantes : {parseInt(ev.capacity) - parseInt(ev.registered)}
          </p>

          <button
            onClick={() => handleReserve(ev.id)}
            disabled={
              ev.reserved || parseInt(ev.registered) >= parseInt(ev.capacity)
            }
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
  );
}
