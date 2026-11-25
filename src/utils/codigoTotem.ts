import crypto from "crypto"

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

export function generarCodigo(): string {
    //genera un código aleatorio de 12 caracteres utilizando el alfabeto definido
    let codigo = ""
    for (let i = 0; i < 12; i++) {
        codigo += ALFABETO[crypto.randomInt(ALFABETO.length)]
    }
    return `${codigo.slice(0, 4)}-${codigo.slice(4, 8)}-${codigo.slice(8, 12)}`

}

export function hashearCodigo(codigo: string): string {

    //elimina los guiones y convierte el código a mayúsculas antes de hashearlo
    const limpio = codigo.replace(/-/g, "").toUpperCase()

    //crea un hash SHA-256 del código limpio y lo devuelve en formato hexadecimal, eso es lo que se guarda en la bd
    return crypto.createHash("sha256").update(limpio).digest("hex")
}

