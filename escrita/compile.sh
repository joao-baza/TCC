#!/bin/bash

# Acessa o diretório TEX a partir de onde o script está
cd "$(dirname "$0")/TEX" || exit 1

# Nome do arquivo principal (sem extensão)
FILE="main"

echo "========================================="
echo " Compilando o documento $FILE.tex..."
echo "========================================="

# Se latexmk estiver disponível, usa-o (mais eficiente)
if command -v latexmk &> /dev/null; then
    echo "Usando latexmk..."
    latexmk -pdf "$FILE.tex"

# Caso contrário, verifica se pdflatex existe e usa a sequência padrão com bibtex
elif command -v pdflatex &> /dev/null; then
    echo "Usando pdflatex padrão..."
    pdflatex "$FILE.tex"
    bibtex "$FILE"
    pdflatex "$FILE.tex"
    pdflatex "$FILE.tex"

# Se nenhum compilador local for encontrado, tenta usar Docker
elif command -v docker &> /dev/null; then
    echo "Compiladores locais não encontrados. Usando Docker (imagem texlive)..."
    DOCKER_CMD="docker"
    if ! docker info &> /dev/null; then
        echo "O Docker requer sudo neste sistema para compilar. Ele pedirá a sua senha:"
        DOCKER_CMD="sudo docker"
    fi
    $DOCKER_CMD run --rm -v "$PWD:/workdir" -w /workdir texlive/texlive:latest bash -c "\
        pdflatex $FILE.tex && \
        bibtex $FILE && \
        pdflatex $FILE.tex && \
        pdflatex $FILE.tex"
else
    echo "Erro: Nenhum compilador LaTeX (pdflatex, latexmk) ou Docker foi encontrado no PATH."
    exit 1
fi

echo "========================================="
echo " Compilação concluída!"
echo " PDF gerado em: $PWD/$FILE.pdf"
echo "========================================="
