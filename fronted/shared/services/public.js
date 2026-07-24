import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { db } from "../firebase.js";

export const getPublicTicket = async (id) => {
  if (!id) return null;
  const ticketRef = doc(db, "tickets", id);
  const ticketSnap = await getDoc(ticketRef);
  if (ticketSnap.exists()) {
    return { id: ticketSnap.id, source: "ticket", ...ticketSnap.data() };
  }
  const projectRef = doc(db, "projects", id);
  const projectSnap = await getDoc(projectRef);
  if (projectSnap.exists()) {
    return { id: projectSnap.id, source: "project", ...projectSnap.data() };
  }
  return null;
};
