# Gato 284 — landing page

Landing page estática e responsiva feita em HTML, CSS e JavaScript, sem dependências de build.

## Prévia local

Na raiz do projeto, execute:

```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

Depois abra `http://localhost:4173`.

## Notas

- O hero usa a foto do estabelecimento enviada no briefing. Se a hospedagem de imagem do Google não responder, há uma foto local de fallback.
- Os botões “Pedir agora” abrem o site de pedidos informado: `https://pedido.anota.ai/loja/restaurante-gato-284`.
- “Como chegar” abre o Google Maps com o endereço fornecido.
- O modal do cardápio direciona ao site oficial de pedidos; nenhum preço individual foi inventado.
- As fotos locais de pratos e ambiente são ilustrativas. Para a publicação final, substitua-as por fotos reais autorizadas do Gato 284 quando disponíveis.
