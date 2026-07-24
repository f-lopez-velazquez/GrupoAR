import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";

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
