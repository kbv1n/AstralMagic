export interface Playmat {
  id: string
  name: string
  url: string
  thumb: string
}

// All packaged playmats — served from /public/textures/
export const PACKAGED_PLAYMATS: Playmat[] = [
  { id: 'bonsai',     name: 'Bonsai Garden',    url: '/textures/bonsai-ozgmx-drgl-lrg.webp',                                                              thumb: '/textures/bonsai-ozgmx-drgl-lrg.webp' },
  { id: 'basketball', name: 'Basketball',        url: '/textures/bsktbll-org-drgl-xxl-drgl-thumb_1778590b-81f5-43b9-9bd8-54e11cb8c081.webp',              thumb: '/textures/bsktbll-org-drgl-xxl-drgl-thumb_1778590b-81f5-43b9-9bd8-54e11cb8c081.webp' },
  { id: 'castle1',    name: 'Castle',            url: '/textures/cstl1-org-drgl-xxl-drgl-thumb.jpg',                                                       thumb: '/textures/cstl1-org-drgl-xxl-drgl-thumb.jpg' },
  { id: 'castle2',    name: 'Dark Castle',       url: '/textures/cstl7-org-drgl-xxl-drgl-thumb.jpg',                                                       thumb: '/textures/cstl7-org-drgl-xxl-drgl-thumb.jpg' },
  { id: 'cowboy',     name: 'Cowboy',            url: '/textures/cwboy-org-drgl-xxl-drgl-thumb_72779e86-7133-4920-a286-bfdc318f9000.jpg',                 thumb: '/textures/cwboy-org-drgl-xxl-drgl-thumb_72779e86-7133-4920-a286-bfdc318f9000.jpg' },
  { id: 'nebula',     name: 'Dragon Nebula',     url: '/textures/drgnebula-org-drgl-xxl-drgl-thumb.webp',                                                  thumb: '/textures/drgnebula-org-drgl-xxl-drgl-thumb.webp' },
  { id: 'dragonwrath',name: 'Dragon Wrath',      url: '/textures/drgwrath-org-stbl-xxl-stbl-thumb.jpg',                                                    thumb: '/textures/drgwrath-org-stbl-xxl-stbl-thumb.jpg' },
  { id: 'gulp',       name: 'Gulp',              url: '/textures/gulp-org-drgl-xxl-drgl-thumb.jpg',                                                        thumb: '/textures/gulp-org-drgl-xxl-drgl-thumb.jpg' },
  { id: 'blackhole',  name: 'Black Hole',        url: '/textures/hole-org-drgl-xxl-drgl-thumb.webp',                                                       thumb: '/textures/hole-org-drgl-xxl-drgl-thumb.webp' },
  { id: 'jeanleon',   name: 'Jean Leon',         url: '/textures/jeanleon-org-drgl-lrg.jpg',                                                               thumb: '/textures/jeanleon-org-drgl-lrg.jpg' },
  { id: 'landers',    name: "Landers Point",     url: '/textures/landerspoint-org-drgl-lrg.jpg',                                                           thumb: '/textures/landerspoint-org-drgl-lrg.jpg' },
  { id: 'lildog',     name: 'Little Dog',        url: '/textures/lildog-org-drgl-xxl-drgl-thumb.jpg',                                                      thumb: '/textures/lildog-org-drgl-xxl-drgl-thumb.jpg' },
  { id: 'purplemap',  name: 'Purple Map',        url: '/textures/map-purp-drgl-xxl-drgl-thumb.webp',                                                       thumb: '/textures/map-purp-drgl-xxl-drgl-thumb.webp' },
  { id: 'phaeton',    name: 'Phaeton',           url: '/textures/phaeton-org-drgl-lrg_c3422eda-a0ce-4716-a69d-05131c845fa7.jpg',                          thumb: '/textures/phaeton-org-drgl-lrg_c3422eda-a0ce-4716-a69d-05131c845fa7.jpg' },
  { id: 'pless',      name: 'Pless',             url: '/textures/pless-org-drgl-lrg_8eedb66d-7965-4cd8-a187-9a1960f549e6.jpg',                            thumb: '/textures/pless-org-drgl-lrg_8eedb66d-7965-4cd8-a187-9a1960f549e6.jpg' },
  { id: 'satomit',    name: 'Satomit',           url: '/textures/satomitgr-org-drgl-xxl-drgl-thumb.webp',                                                  thumb: '/textures/satomitgr-org-drgl-xxl-drgl-thumb.webp' },
  { id: 'scarlet',    name: 'Scarlet Power',     url: '/textures/scrltpwr-org-drgl-xxl-drgl-thumb_6a2a147b-9626-456e-b9d4-22fe8ed2ac89.jpg',              thumb: '/textures/scrltpwr-org-drgl-xxl-drgl-thumb_6a2a147b-9626-456e-b9d4-22fe8ed2ac89.jpg' },
  { id: 'nevada',     name: 'Nevada',            url: '/textures/snvda-org-drgl-xxl-drgl-thumb.jpg',                                                       thumb: '/textures/snvda-org-drgl-xxl-drgl-thumb.jpg' },
  { id: 'starblue',   name: 'Star Cruise Blue',  url: '/textures/strcr-bgr-drgl-xxl-drgl-thumb.jpg',                                                       thumb: '/textures/strcr-bgr-drgl-xxl-drgl-thumb.jpg' },
  { id: 'starred',    name: 'Star Cruise Red',   url: '/textures/strcr-red-aero-lrg-aero-thumb.jpg',                                                       thumb: '/textures/strcr-red-aero-lrg-aero-thumb.jpg' },
  { id: 'stargreen',  name: 'Star Cruise Green', url: '/textures/strcr-ver-drgl-xxl-drgl-thumb.jpg',                                                       thumb: '/textures/strcr-ver-drgl-xxl-drgl-thumb.jpg' },
  { id: 'strangeorn', name: 'Strange Orange',    url: '/textures/strge-orn-drgl-xxl-drgl-thumb.jpg',                                                       thumb: '/textures/strge-orn-drgl-xxl-drgl-thumb.jpg' },
  { id: 'starsetbrn', name: 'Starset Brown',     url: '/textures/strst-brw-drgl-xxl-drgl-thumb.jpg',                                                       thumb: '/textures/strst-brw-drgl-xxl-drgl-thumb.jpg' },
  { id: 'starsetgrn', name: 'Starset Green',     url: '/textures/strst-grn-drgl-xxl-drgl-thumb_2b2eca77-4145-460a-bbf5-4e08e493566d.jpg',                 thumb: '/textures/strst-grn-drgl-xxl-drgl-thumb_2b2eca77-4145-460a-bbf5-4e08e493566d.jpg' },
  { id: 'theten',     name: 'The Ten',           url: '/textures/theten-bw-drgl-lrg.jpg',                                                                  thumb: '/textures/theten-bw-drgl-lrg.jpg' },
  { id: 'french',     name: 'French Art',        url: '/textures/unnamedfrench-org-drgl-lrg_7470c323-7b82-4f9e-a742-19e0ed29cd83.jpg',                    thumb: '/textures/unnamedfrench-org-drgl-lrg_7470c323-7b82-4f9e-a742-19e0ed29cd83.jpg' },
]

export const PACKAGED_PLAYMAT_URLS = new Set(PACKAGED_PLAYMATS.map(p => p.url))

export function isPackagedPlaymat(url: string): boolean {
  return PACKAGED_PLAYMAT_URLS.has(url)
}

export function getAvailablePlaymats(takenUrls: string[]): Playmat[] {
  const taken = new Set(takenUrls)
  return PACKAGED_PLAYMATS.filter(p => !taken.has(p.url))
}
