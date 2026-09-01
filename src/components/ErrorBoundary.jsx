import { Component } from "react";

// Un errore di rendering in un punto qualunque dell'albero (un feed con dati
// più esotici del previsto, un bug non ancora scoperto) faceva sparire tutta
// l'app dietro una schermata bianca — barra di navigazione compresa, quindi
// senza nemmeno la possibilità di cambiare scheda per uscirne. Un error
// boundary è l'unico modo in React di intercettare questi errori (deve
// essere una classe: non esiste un hook equivalente).
//
// Il chiamante passa una `key` legata a cosa si sta mostrando (scheda,
// sezione, articolo aperto): cambiarla fa rimontare il boundary da capo,
// quindi uscire dal contenuto che ha fatto crashare basta a uscire anche
// dallo stato di errore, senza dover ricaricare l'intera app.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("[AldusRSS] errore di rendering:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
